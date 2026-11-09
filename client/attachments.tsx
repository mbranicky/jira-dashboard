import {radii} from './radii';
import {Tooltip} from './tooltip';
import {SectionHeading} from './section-heading';
import {useRef,useState} from 'react';
import {Image,Pressable,Text,View} from 'react-native';
import {useRpc} from '@getpaseo/plugin/client';
import {Icon} from '@getpaseo/plugin/client/ui';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {prepareBrowserPreview,loadBrowserPreview,listAttachments,attachmentSettings,readAttachment,beginUpload,uploadChunk,finishUpload,cancelUpload,CHUNK_SIZE,TRANSFER_LIMIT,fileSize,type Attachment} from '../shared/attachments';
import {Action} from './settings-ui';
import {canTryBrowserPreview,localPreviewAvailable,canTransferFiles,chooseAttachment,fileChunk,saveAttachment,openExternal,type LocalAttachment} from './web';
type Theme=Parameters<typeof Action>[0]['theme'];
export function IssueAttachments(props:{issueKey:string;hostId:string;theme:Theme;readOnly?:boolean;connectionRevision?:string}){return <Attachments key={`${props.hostId}/${props.issueKey}/${props.connectionRevision}/${props.readOnly}`} {...props}/>;}
function Attachments({issueKey,hostId,theme,readOnly=false,connectionRevision=''}:{issueKey:string;hostId:string;theme:Theme;readOnly?:boolean;connectionRevision?:string}){
 const [expanded,setExpanded]=useState(true);const [rowWidth,setRowWidth]=useState(0);
 const preparePreview=useRpc(prepareBrowserPreview),loadPreview=useRpc(loadBrowserPreview);
 const c=theme.colors;const list=useRpc(listAttachments),meta=useRpc(attachmentSettings),read=useRpc(readAttachment),begin=useRpc(beginUpload),chunk=useRpc(uploadChunk),finish=useRpc(finishUpload),cancel=useRpc(cancelUpload);const cache=useQueryClient();
 const queryKey=['jira-attachments',hostId,connectionRevision,issueKey];const query=useQuery({queryKey,queryFn:()=>list({key:issueKey}),retry:false});
 const limits=useQuery({queryKey:['jira-attachment-settings',hostId,connectionRevision],queryFn:()=>meta({}),enabled:!readOnly,retry:false});
 const [file,setFile]=useState<LocalAttachment>();const [busy,setBusy]=useState('');const lock=useRef(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [preview,setPreview]=useState<{id:string;uri:string}>();
 const jira=()=>query.data?openExternal(`${query.data.site}/browse/${issueKey}`):undefined;
 const fail=(e:unknown)=>setError(e instanceof Error?e.message:'Attachment transfer failed.');
 async function select(){try{const selected=await chooseAttachment();if(!selected)return;setError('');setNotice('');const limit=Math.min(TRANSFER_LIMIT,limits.data?.uploadLimit??0);if(!selected.size||selected.size>limit){setError(`Choose a non-empty file up to ${fileSize(limit)}. Larger files can be uploaded in Jira.`);return;}setFile(selected);}catch(e){fail(e);}}
 async function upload(){if(!file||lock.current)return;lock.current=true;setBusy('Uploading…');setError('');let id:string|undefined;let submitted=false;
  try{const result=await begin({key:issueKey,filename:file.name,size:file.size,mimeType:file.type});id=result.uploadId;for(let offset=0;offset<file.size;offset+=CHUNK_SIZE){await chunk({uploadId:id,offset,base64:await fileChunk(file,offset,offset+CHUNK_SIZE)});setBusy(`Uploading ${Math.min(100,Math.round((offset+CHUNK_SIZE)/file.size*100))}%`);}submitted=true;await finish({uploadId:id});setNotice('Attachment uploaded.');setFile(undefined);await cache.invalidateQueries({queryKey});}
  catch(e){fail(e);if(submitted)setFile(undefined);}finally{if(id&&!submitted)await cancel({uploadId:id}).catch(()=>{});lock.current=false;setBusy('');}
 }
 async function transfer(item:Attachment,show:boolean){if(lock.current)return;lock.current=true;setBusy(show?'Loading preview…':'Downloading…');setError('');
  try{const parts:string[]=[];for(let offset=0;offset<item.size;offset+=CHUNK_SIZE){const data=await read({key:issueKey,id:item.id,offset});if(data.total!==item.size)throw new Error('Attachment changed. Refresh and try again.');parts.push(data.base64);}if(show)setPreview({id:item.id,uri:`data:${item.mimeType};base64,${parts.join('')}`});else saveAttachment(item.filename,parts);}catch(e){fail(e);}finally{lock.current=false;setBusy('');}
 }
 async function externalImage(item:Attachment){
  if(lock.current)return;
  if(canTryBrowserPreview()){
   lock.current=true;setBusy('Opening browser preview…');setError('');
   try{const target=await preparePreview({});if(await localPreviewAvailable(target.baseUrl,target.token)){await loadPreview({key:issueKey,id:item.id,token:target.token});await openExternal(`${target.baseUrl}/${target.token}/image`);setNotice('Browser preview is available for 5 minutes.');return;}}
   catch{/* The in-app preview remains available if local serving or opening fails. */}
   finally{lock.current=false;setBusy('');}
  }
  setNotice('Showing the image here; a local browser preview is unavailable on this connection.');await transfer(item,true);
 }
 const button=(label:string,icon:string,action:()=>void,disabled=false)=><AttachmentAction theme={theme} label={label} icon={icon} onPress={action} disabled={disabled}/>;
 return <View style={{borderTopWidth:1,borderTopColor:c.border,paddingTop:14,gap:10,minWidth:0}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:8}}><SectionHeading title={`Attachments${query.data?` (${query.data.files.length})`:''}`} icon="Paperclip" theme={theme} expanded={expanded} onPress={()=>setExpanded(!expanded)}/>{button('Refresh attachments','RefreshCw',()=>void query.refetch(),query.isFetching||!!busy)}</View>
  <View onLayout={e=>setRowWidth(e.nativeEvent.layout.width)} style={{display:expanded?'flex':'none',gap:8,minWidth:0}}>
  {query.isPending?<Text style={{color:c.foregroundMuted}}>Loading attachments…</Text>:null}
  {query.error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{query.error.message}</Text>:null}
  {query.data?.files.length===0?<Text style={{fontSize:13,color:c.foregroundMuted}}>No attachments yet.</Text>:null}
  {query.data?.files.map(item=><View key={item.id} style={{borderWidth:1,borderColor:c.border,borderRadius:radii.control,padding:8,gap:4,minWidth:0}}>
   <View style={{flexDirection:rowWidth>=460?'row':'column',gap:2,alignItems:rowWidth>=460?'center':'stretch'}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8,flex:rowWidth>=460?1:undefined,minWidth:0}}><Icon name={item.mimeType.startsWith('image/')?'Image':'FileText'} size={18} color={c.accent}/><View style={{flex:1,minWidth:0}}><Text selectable style={{fontSize:13,fontWeight:'500',color:c.foreground}}>{item.filename}</Text><Text style={{fontSize:11,color:c.foregroundMuted,marginTop:3}}>{fileSize(item.size)} · {item.author} · {new Date(item.created).toLocaleString()}</Text></View></View>
   <View style={{flexDirection:'row',alignItems:'center',gap:2}}>{/^image\/(png|jpeg|gif|webp)$/.test(item.mimeType)&&item.size<=TRANSFER_LIMIT?button(preview?.id===item.id?'Close preview':'Preview image',preview?.id===item.id?'EyeOff':'Eye',()=>preview?.id===item.id?setPreview(undefined):void transfer(item,true),!!busy):null}{canTransferFiles&&item.size<=TRANSFER_LIMIT?button('Download attachment','Download',()=>void transfer(item,false),!!busy):null}{button(/^image\/(png|jpeg|gif|webp)$/.test(item.mimeType)&&item.size<=TRANSFER_LIMIT?'Open image in browser (in-app fallback)':'Open containing issue in Jira','ExternalLink',()=>{if(/^image\/(png|jpeg|gif|webp)$/.test(item.mimeType)&&item.size<=TRANSFER_LIMIT)void externalImage(item);else void openExternal(`${query.data!.site}/browse/${issueKey}`);},!!busy)}</View>
   </View>
   {preview?.id===item.id?<Image accessibilityLabel={item.filename} source={{uri:preview.uri}} resizeMode="contain" style={{width:'100%',height:220,backgroundColor:c.surface1,borderRadius:radii.small}}/>:null}
  </View>)}
  {readOnly?null:file?<View style={{padding:12,borderWidth:1,borderColor:c.border,borderRadius:radii.card,gap:8}}><Text style={{color:c.foreground,fontSize:13}}>{file.name} · {fileSize(file.size)}</Text><Text style={{color:c.foregroundMuted,fontSize:12}}>Upload to {issueKey}. This file will be visible to people who can access the issue.</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}><Action theme={theme} primary icon="Upload" label="Upload" onPress={()=>void upload()} disabled={!!busy}/><Action theme={theme} icon="X" label="Cancel" onPress={()=>setFile(undefined)} disabled={!!busy}/></View></View>:canTransferFiles?<Action theme={theme} flushLeft icon="Plus" label="Add attachment" onPress={()=>void select()} disabled={!!busy||!limits.data?.enabled||!query.isSuccess}/>:<Action theme={theme} flushLeft icon="ExternalLink" label="Upload in Jira" onPress={()=>void jira()} disabled={!query.data}/>}
  {limits.data&&!limits.data.enabled?<Text style={{color:c.foregroundMuted,fontSize:12}}>Attachments are disabled in Jira.</Text>:null}
  {limits.data?.limitSource==='plugin'?<Text style={{color:c.foregroundMuted,fontSize:12}}>Jira attachment settings could not be read. The plugin allows files up to 25 MiB; Jira checks whether attachments are enabled, its own limit and your permissions when you upload.</Text>:null}
  {limits.error?<Text style={{color:c.statusDanger,fontSize:12}}>Upload settings unavailable. Check permissions or upload in Jira.</Text>:null}
  {busy||notice?<Text accessibilityLiveRegion="polite" style={{color:c.accent,fontSize:12}}>{busy||notice}</Text>:null}
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger,fontSize:13,lineHeight:19}}>{error}</Text>:null}
  </View>
 </View>;
}

function AttachmentAction({theme,label,icon,onPress,disabled}:{theme:Theme;label:string;icon:string;onPress:()=>void;disabled:boolean}){
 const [tip,setTip]=useState(false);const c=theme.colors;
 const tooltip=label==='Open image in browser (in-app fallback)'?'Open in browser':label==='Open containing issue in Jira'?'Open in Jira':label;
 return <View style={{position:'relative',flexShrink:0,zIndex:tip?10:0}}>{tip?<Tooltip theme={theme} text={tooltip} offset={40}/>:null}<Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onHoverIn={()=>setTip(true)} onHoverOut={()=>setTip(false)} onFocus={()=>setTip(true)} onBlur={()=>setTip(false)} onLongPress={()=>setTip(true)} onPress={()=>{setTip(false);onPress();}} style={({pressed})=>({width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:radii.control,backgroundColor:pressed?c.surface2:'transparent',opacity:disabled?.4:1})}><Icon name={icon} size={16} color={c.foregroundMuted}/></Pressable></View>;
}
