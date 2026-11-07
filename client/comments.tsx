import {createDraftStore,draftStorageKey,readDraftIdentity,type CommentDraft} from '../shared/comment-drafts';
import {localDraftStorage,requiresDurableDeliveryMarker} from './web';
import {Tooltip} from './tooltip';
import {JiraContent} from './jira-content';
import {SectionHeading} from './section-heading';
import {useRef,useState} from 'react';
import {useRpc} from '@getpaseo/plugin/client';
import {Icon} from '@getpaseo/plugin/client/ui';
import {useInfiniteQuery,useQuery,useQueryClient} from '@tanstack/react-query';
import {Pressable,Text,TextInput,View} from 'react-native';
import {linkedReplyThreads,commentThreads,listComments,postComment,markdownToAdf,richBlocks,safeLink,type JiraComment,type RichBlock} from '../shared/comments';
import {openExternal} from './web';
import {Action} from './settings-ui';

type Theme=Parameters<typeof Action>[0]['theme'];
type Draft=CommentDraft;
const drafts=createDraftStore(localDraftStorage);
const newId=()=> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return (c==='x'?r:(r&3)|8).toString(16);});
const message=(error:unknown)=>error instanceof Error?error.message.replace(/^Request failed: /,'').replace(/\s+requestType=.*$/,''):'Could not load comments.';
export function CommentContent({blocks,theme,onOpenJira}:{blocks:RichBlock[];theme:Theme;onOpenJira?:()=>void}){
 return <JiraContent onOpenJira={onOpenJira} blocks={blocks} theme={theme} empty="Empty comment."/>;
}
export function IssueComments({issueKey,hostId,theme,readOnly=false,connectionRevision=''}:{issueKey:string;hostId:string;theme:Theme;readOnly?:boolean;connectionRevision?:string}){
 const identify=useRpc(readDraftIdentity);
 const identity=useQuery({queryKey:['jira-draft-identity',hostId,connectionRevision],queryFn:()=>identify({}),enabled:!readOnly,retry:false,staleTime:0,refetchOnWindowFocus:false});
 const scope=identity.isSuccess&&identity.isFetchedAfterMount&&!identity.isFetching?draftStorageKey(hostId,identity.data.site,identity.data.accountId,issueKey):undefined;
 return <>{!readOnly&&identity.error?<View><Text accessibilityRole="alert" style={{color:theme.colors.statusDanger}}>Could not verify the account for private drafts.</Text><Action theme={theme} label="Retry draft identity" icon="RefreshCw" onPress={()=>void identity.refetch()}/></View>:null}<Comments key={`${scope??hostId}/${issueKey}/${connectionRevision}/${readOnly||!scope||!!identity.error}`} draftScope={scope} readOnly={readOnly||!scope||!!identity.error} connectionRevision={connectionRevision} issueKey={issueKey} hostId={hostId} theme={theme}/></>;
}
function Comments({issueKey,hostId,theme,readOnly,connectionRevision,draftScope}:{issueKey:string;hostId:string;theme:Theme;readOnly:boolean;connectionRevision:string;draftScope?:string}){
 const [expanded,setExpanded]=useState(true);
 const c=theme.colors;const read=useRpc(listComments);const post=useRpc(postComment);const cache=useQueryClient();
 const draftKey=draftScope??'';const identify=useRpc(readDraftIdentity);
 const [draft,setDraft]=useState<Draft|undefined>(()=>readOnly?undefined:drafts.read(draftKey));const [preview,setPreview]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [durable,setDurable]=useState(()=>drafts.isDurable(draftKey));
 const [refreshFeedback,setRefreshFeedback]=useState('');
 const posting=useRef(false);const input=useRef<TextInput>(null);const selection=useRef({start:0,end:0});
 const queryKey=['jira-comments',hostId,connectionRevision,issueKey];
 const query=useInfiniteQuery({queryKey,initialPageParam:0,queryFn:({pageParam})=>read({key:issueKey,startAt:pageParam}),getNextPageParam:last=>last.nextStart??undefined,retry:false});
 const site=query.data?.pages[0]?.site;const comments=linkedReplyThreads(query.data?.pages.flatMap(p=>p.comments)??[],site,issueKey);const rows=commentThreads(comments);
 function update(value:Draft|undefined){setDraft(value);const saved=drafts.write(draftKey,value);setDurable(saved);return saved;}
 function begin(parent?:JiraComment){if(draft)return;update({text:'',parent:parent?{id:parent.id,author:parent.author,restricted:parent.restricted}:undefined,requestId:newId()});setPreview(false);setError('');setNotice('');}
 function insert(before:string,after='',placeholder='text'){
  if(!draft||busy||draft.uncertain)return;const {start,end}=selection.current;const text=draft.text.slice(0,start)+before+(draft.text.slice(start,end)||placeholder)+after+draft.text.slice(end);
  update({...draft,text});input.current?.focus();
 }
 async function submit(){
  if(readOnly||!draft||!draft.text.trim()||posting.current||draft.uncertain)return;
  posting.current=true;setRefreshFeedback('');setBusy(true);setError('');const submitted=draft;
  try{
   const identity=await identify({});
   if(draftStorageKey(hostId,identity.site,identity.accountId,issueKey)!==draftKey)throw Error('Jira account changed. Reopen this issue before posting.');
   // Persist uncertainty before sending: a reload during delivery must never enable a blind retry.
   const deliverySaved=update({...submitted,uncertain:true});
   if(requiresDurableDeliveryMarker&&!deliverySaved)throw Error('Could not save delivery state on this device. Copy your draft and free device storage before posting.');
   await post({key:issueKey,markdown:submitted.text,requestId:submitted.requestId,parentId:submitted.parent?.id});
   update(undefined);setNotice(submitted.parent?'Linked reply posted.':'Comment posted.');
   await cache.invalidateQueries({queryKey}).catch(()=>{});
  }catch(e){setError(message(e));update({...submitted,uncertain:true});}
  finally{posting.current=false;setBusy(false);}
 }
 async function refreshForReview(){
  setRefreshFeedback('');
  const result=await query.refetch();
  setRefreshFeedback(result.isError?'Could not refresh comments. Check Jira before retrying.':'Comments refreshed. Review the list before trying again.');
 }
 const iconButton=(label:string,icon:string,onPress:()=>void,disabled=false)=><CommentIcon theme={theme} label={label} icon={icon} onPress={onPress} disabled={disabled}/>;
 const editor=!readOnly&&draft?<View style={{gap:10,minWidth:0}}>
  <Text style={{color:c.foregroundMuted,fontSize:12}}>{durable?'Draft saved on this device.':'Draft kept for this session only. Copy it before restarting or reloading.'}</Text>
  {draft.parent?<View style={{flexDirection:'row',gap:6,alignItems:'center'}}><Icon name="Reply" size={14} color={c.accent}/><Text style={{color:c.foregroundMuted,fontSize:12,flex:1}}>Linked reply to {draft.parent.author}</Text></View>:null}
  {draft.parent?<Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>Posts a new top-level comment with a link to the original.{draft.parent.restricted?' Keeps the original visibility restriction.':''}</Text>:null}
  <View style={{borderWidth:1,borderColor:error?c.statusDanger:c.border,borderRadius:10,overflow:'hidden'}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',paddingHorizontal:4,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.surface1}}>
    {iconButton('Bold','Bold',()=>insert('**','**'),busy||!!draft.uncertain)}{iconButton('Italic','Italic',()=>insert('*','*'),busy||!!draft.uncertain)}{iconButton('Bullet list','List',()=>insert('\n- ','','List item'),busy||!!draft.uncertain)}{iconButton('Code block','Code',()=>insert('\n```\n','\n```','code'),busy||!!draft.uncertain)}{iconButton('Link','Link',()=>insert('[','](https://example.com)','link text'),busy||!!draft.uncertain)}{iconButton(preview?'Edit Markdown':'Preview comment',preview?'Pencil':'Eye',()=>setPreview(!preview),busy)}
   </View>
   {preview?<View style={{padding:12,minHeight:120}}><CommentContent blocks={richBlocks(markdownToAdf(draft.text))} theme={theme}/></View>:<TextInput ref={input} accessibilityLabel={draft.parent?'Write a linked reply in Markdown':'Write a comment in Markdown'} placeholder="Write a comment…" placeholderTextColor={c.foregroundMuted} multiline textAlignVertical="top" editable={!busy&&!draft.uncertain} value={draft.text} onSelectionChange={e=>{selection.current=e.nativeEvent.selection;}} onChangeText={text=>update({...draft,text})} maxLength={16000} style={{color:c.foreground,fontSize:14,lineHeight:21,padding:12,minHeight:130,maxHeight:340}}/>}
  </View>
  <Text style={{color:c.foregroundMuted,fontSize:11,lineHeight:17}}>Markdown: **bold**, *italic*, lists, headings, quotes, links and code. Use Preview to check formatting.</Text>
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger,fontSize:13,lineHeight:19}}>{error}</Text>:null}
  {draft.uncertain?<><Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>Refresh the comments and compare them with your draft. If you find your comment, discard the draft. If delivery is still unclear, check Jira before trying again.</Text><Action theme={theme} label={query.isFetching?'Refreshing comments…':'Refresh comments'} icon="RefreshCw" disabled={query.isFetching} onPress={()=>void refreshForReview()}/>{refreshFeedback?<Text accessibilityLiveRegion="polite" style={{color:c.foregroundMuted,fontSize:12}}>{refreshFeedback}</Text>:null}<Action theme={theme} label="I checked — enable another attempt" disabled={query.isFetching} icon="RotateCcw" onPress={()=>{update({...draft,uncertain:false,requestId:newId()});setError('');}}/></>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}><Action theme={theme} primary icon="Send" label={busy?'Posting…':draft.parent?'Post linked reply':'Post comment'} onPress={()=>void submit()} disabled={busy||!!draft.uncertain||!draft.text.trim()}/><Action theme={theme} icon="X" label="Discard" onPress={()=>{update(undefined);setError('');}} disabled={busy}/></View>
 </View>:null;
 return <View style={{borderTopWidth:1,borderTopColor:c.border,paddingTop:14,gap:10,minWidth:0}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:8}}><SectionHeading title={`Comments${query.data?` (${query.data.pages[0]!.total})`:''}`} icon="MessageSquare" theme={theme} expanded={expanded} onPress={()=>setExpanded(!expanded)}/>{iconButton('Refresh comments','RefreshCw',()=>void query.refetch(),query.isFetching)}</View>
  <View style={{display:expanded?'flex':'none',gap:8,minWidth:0}}>
  {notice?<Text accessibilityLiveRegion="polite" style={{color:c.accent,fontSize:13}}>{notice}</Text>:null}
  {query.isSuccess&&!rows.length?<Text style={{color:c.foregroundMuted,fontSize:13}}>No comments yet.</Text>:null}
  {!readOnly&&!draft?<Action theme={theme} flushLeft icon="Plus" label="Add comment" onPress={()=>begin()} disabled={!query.isSuccess}/>:null}
  {draft&&!draft.parent?editor:null}
  {query.isPending?<Text style={{color:c.foregroundMuted}}>Loading comments…</Text>:null}
  {query.error?<Text accessibilityRole="alert" style={{color:c.statusDanger,fontSize:13,lineHeight:19}}>{message(query.error)}</Text>:null}
  {rows.map(({comment,depth})=><View key={comment.id} accessibilityLabel={`Comment by ${comment.author}`} style={{gap:8,marginTop:8,paddingTop:8,paddingBottom:8,marginLeft:Math.min(depth,2)*10,paddingLeft:depth?10:0,borderLeftWidth:depth?2:0,borderLeftColor:c.border,minWidth:0}}>
   <View style={{flexDirection:'row',gap:9,alignItems:'flex-start'}}><View style={{width:30,height:30,borderRadius:15,backgroundColor:c.surface2,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.accent,fontSize:11,fontWeight:'700'}}>{comment.author.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</Text></View><View style={{flex:1,minWidth:0,gap:2}}><Text style={{color:c.foreground,fontSize:13,fontWeight:'600'}}>{comment.author}</Text><Text style={{color:c.foregroundMuted,fontSize:11,lineHeight:16}}>Created {new Date(comment.created).toLocaleString()}{comment.restricted?' · Restricted':''}</Text>{comment.updated&&Date.parse(comment.updated)>Date.parse(comment.created)?<Text style={{color:c.foregroundMuted,fontSize:11,lineHeight:16}}>Edited {new Date(comment.updated).toLocaleString()}</Text>:null}</View>{site?iconButton('Open comment in Jira','ExternalLink',()=>void openExternal(`${site}/browse/${issueKey}?focusedCommentId=${comment.id}`)):null}</View>
   {comment.parentId&&!comments.some(c=>c.id===comment.parentId)?<Text style={{color:c.foregroundMuted,fontSize:11}}>Reply · original comment not loaded or unavailable</Text>:null}
   <CommentContent blocks={comment.blocks} theme={theme} onOpenJira={site?()=>void openExternal(`${site}/browse/${issueKey}?focusedCommentId=${comment.id}`):undefined}/>
   {!readOnly?<View style={{flexDirection:'row',alignItems:'center'}}><Action theme={theme} flushLeft paddingRight={0} icon="Reply" label="Reply" onPress={()=>begin(comment)} disabled={!!draft}/></View>:null}
   {draft?.parent?.id===comment.id?editor:null}
  </View>)}
  {draft?.parent&&!comments.some(c=>c.id===draft.parent!.id)?editor:null}
  {query.hasNextPage?<Action theme={theme} icon="ChevronDown" label={query.isFetchingNextPage?'Loading…':`Load more comments (${rows.length} loaded)`} onPress={()=>void query.fetchNextPage()} disabled={query.isFetching}/>:null}
  </View>
 </View>;
}

function CommentIcon({theme,label,icon,onPress,disabled=false}:{theme:Theme;label:string;icon:string;onPress:()=>void;disabled?:boolean}){
 const [tip,setTip]=useState(false);const c=theme.colors;
 return <View style={{position:'relative',flexShrink:0,alignSelf:'flex-start',zIndex:tip?10:0}}>{tip?<Tooltip theme={theme} text={label} offset={40}/>:null}<Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onHoverIn={()=>setTip(true)} onHoverOut={()=>setTip(false)} onFocus={()=>setTip(true)} onBlur={()=>setTip(false)} onLongPress={()=>setTip(true)} onPress={()=>{setTip(false);onPress();}} style={({pressed})=>({width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:6,backgroundColor:pressed?c.surface2:'transparent',opacity:disabled?.4:1})}><Icon name={icon} size={16} color={c.foregroundMuted}/></Pressable></View>;
}
