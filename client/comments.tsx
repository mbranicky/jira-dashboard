import {JiraContent} from './jira-content';
import {SectionHeading} from './section-heading';
import {useRef,useState} from 'react';
import {useRpc} from '@getpaseo/plugin/client';
import {Icon} from '@getpaseo/plugin/client/ui';
import {useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {Pressable,Text,TextInput,View} from 'react-native';
import {commentThreads,listComments,postComment,markdownToAdf,richBlocks,safeLink,type JiraComment,type RichBlock} from '../shared/comments';
import {openExternal} from './web';
import {Action} from './settings-ui';

type Theme=Parameters<typeof Action>[0]['theme'];
type Draft={text:string;parent?:JiraComment;requestId:string;uncertain?:boolean};
// Retain drafts when a details modal closes or a workspace tab unmounts, within this client session.
const drafts=new Map<string,Draft>();
const newId=()=> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return (c==='x'?r:(r&3)|8).toString(16);});
const message=(error:unknown)=>error instanceof Error?error.message.replace(/^Request failed: /,'').replace(/\s+requestType=.*$/,''):'Could not load comments.';
export function CommentContent({blocks,theme}:{blocks:RichBlock[];theme:Theme}){
 return <JiraContent blocks={blocks} theme={theme} empty="Empty comment."/>;
}
export function IssueComments({issueKey,hostId,theme,readOnly=false,connectionRevision=''}:{issueKey:string;hostId:string;theme:Theme;readOnly?:boolean;connectionRevision?:string}){
 return <Comments key={`${hostId}/${issueKey}/${connectionRevision}/${readOnly}`} readOnly={readOnly} connectionRevision={connectionRevision} issueKey={issueKey} hostId={hostId} theme={theme}/>;
}
function Comments({issueKey,hostId,theme,readOnly,connectionRevision}:{issueKey:string;hostId:string;theme:Theme;readOnly:boolean;connectionRevision:string}){
 const [expanded,setExpanded]=useState(true);
 const c=theme.colors;const read=useRpc(listComments);const post=useRpc(postComment);const cache=useQueryClient();
 const draftKey=`${hostId}/${issueKey}`;
 const [draft,setDraft]=useState<Draft|undefined>(()=>readOnly?undefined:drafts.get(draftKey));const [preview,setPreview]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const posting=useRef(false);const input=useRef<TextInput>(null);const selection=useRef({start:0,end:0});
 const queryKey=['jira-comments',hostId,connectionRevision,issueKey];
 const query=useInfiniteQuery({queryKey,initialPageParam:0,queryFn:({pageParam})=>read({key:issueKey,startAt:pageParam}),getNextPageParam:last=>last.nextStart??undefined,retry:false});
 const comments=query.data?.pages.flatMap(p=>p.comments)??[];const rows=commentThreads(comments);const site=query.data?.pages[0]?.site;
 function update(value:Draft|undefined){setDraft(value);if(value)drafts.set(draftKey,value);else drafts.delete(draftKey);}
 function begin(parent?:JiraComment){if(draft)return;update({text:'',parent,requestId:newId()});setPreview(false);setError('');setNotice('');}
 function insert(before:string,after='',placeholder='text'){
  if(!draft||busy||draft.uncertain)return;const {start,end}=selection.current;const text=draft.text.slice(0,start)+before+(draft.text.slice(start,end)||placeholder)+after+draft.text.slice(end);
  update({...draft,text});input.current?.focus();
 }
 async function submit(){
  if(!draft||!draft.text.trim()||posting.current||draft.uncertain)return;
  posting.current=true;setBusy(true);setError('');const submitted=draft;
  try{
   await post({key:issueKey,markdown:submitted.text,requestId:submitted.requestId,parentId:submitted.parent?.id});
   update(undefined);setNotice(submitted.parent?'Linked reply posted.':'Comment posted.');
   await cache.invalidateQueries({queryKey}).catch(()=>{});
  }catch(e){setError(message(e));update({...submitted,uncertain:true});}
  finally{posting.current=false;setBusy(false);}
 }
 const iconButton=(label:string,icon:string,onPress:()=>void,disabled=false)=><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({pressed})=>({width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:6,backgroundColor:pressed?c.surface2:'transparent',opacity:disabled?.4:1,transform:[{scale:pressed?.96:1}]})}><Icon name={icon} size={16} color={c.foregroundMuted}/></Pressable>;
 const editor=!readOnly&&draft?<View style={{gap:10,minWidth:0}}>
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
  {draft.uncertain?<><Text style={{color:c.foregroundMuted,fontSize:12,lineHeight:18}}>Check refreshed comments and Jira before trying again, to avoid duplicates. Your draft is retained.</Text><Action theme={theme} label="I checked — enable another attempt" icon="RotateCcw" onPress={()=>{update({...draft,uncertain:false,requestId:newId()});setError('');}}/></>:null}
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
  {rows.map(({comment,depth})=><View key={comment.id} style={{gap:9,marginLeft:Math.min(depth,2)*12,paddingLeft:depth?10:0,borderLeftWidth:depth?2:0,borderLeftColor:c.border,minWidth:0}}>
   <View style={{flexDirection:'row',gap:9,alignItems:'flex-start'}}><View style={{width:30,height:30,borderRadius:15,backgroundColor:c.surface2,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.accent,fontSize:11,fontWeight:'700'}}>{comment.author.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</Text></View><View style={{flex:1,gap:3}}><Text style={{color:c.foreground,fontSize:13,fontWeight:'600'}}>{comment.author}</Text><Text style={{color:c.foregroundMuted,fontSize:11,lineHeight:16}}>Created {new Date(comment.created).toLocaleString()}{comment.restricted?' · Restricted':''}</Text>{comment.updated&&Date.parse(comment.updated)>Date.parse(comment.created)?<Text style={{color:c.foregroundMuted,fontSize:11,lineHeight:16}}>Edited {new Date(comment.updated).toLocaleString()}</Text>:null}</View></View>
   {comment.parentId&&!comments.some(c=>c.id===comment.parentId)?<Text style={{color:c.foregroundMuted,fontSize:11}}>Reply · original comment not loaded or unavailable</Text>:null}
   <CommentContent blocks={comment.blocks} theme={theme}/>
   <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:2}}>{!readOnly?<Action theme={theme} flushLeft paddingRight={0} icon="Reply" label="Reply" onPress={()=>begin(comment)} disabled={!!draft}/>:null}{site?iconButton('Open comment in Jira','ExternalLink',()=>void openExternal(`${site}/browse/${issueKey}?focusedCommentId=${comment.id}`)):null}</View>
   {draft?.parent?.id===comment.id?editor:null}
  </View>)}
  {draft?.parent&&!comments.some(c=>c.id===draft.parent!.id)?editor:null}
  {query.hasNextPage?<Action theme={theme} icon="ChevronDown" label={query.isFetchingNextPage?'Loading…':`Load more comments (${rows.length} loaded)`} onPress={()=>void query.fetchNextPage()} disabled={query.isFetching}/>:null}
  </View>
 </View>;
}
