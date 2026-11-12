import {OverlayMenu} from './overlay-menu';
import {radii} from './radii';
import {IconAction} from './icon-action';
import {useState,type ReactNode} from 'react';
import {Text,TextInput,View} from 'react-native';
import {useSettings} from '@getpaseo/plugin/client';
import {connection,type Connection} from '../shared/contracts';
import {addSavedBoard,canonicalBoardUrl,selectSavedBoard} from '../shared/saved-boards';
import {Action,type SettingsTheme} from './settings-ui';
import {ResponsiveSelect} from './responsive-select';
export function SavedBoards({theme,compact,onSelected,children}:{theme:SettingsTheme;compact:boolean;onSelected:()=>void;children?:ReactNode}){
 const settings=useSettings(connection);const [open,setOpen]=useState(false);const [name,setName]=useState('');const [url,setUrl]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const c=theme.colors;
 if(settings.status!=='ready')return <>{children}</>;
 const config=settings.values;let current:string;try{current=canonicalBoardUrl(config.boardUrl);}catch{return <>{children}</>;}
 const boards=config.savedBoards.filter(b=>new URL(b.url).origin===new URL(current).origin);
 const options=[...boards.map(b=>({label:b.name,value:canonicalBoardUrl(b.url)})),...(!boards.some(b=>canonicalBoardUrl(b.url)===current)?[{label:`Current board · ${current.split('/').pop()}`,value:current}]:[])];
 async function save(next:()=>Connection,select=false){if(settings.status!=='ready'||busy||settings.saving)return;setBusy(true);setError('');try{const ok=await settings.save(next(),settings.revision);if(!ok)throw Error('Could not save boards. Reload settings and try again.');if(select)onSelected();else{setName('');setUrl('');}}catch(e){setOpen(true);setError(e instanceof Error?e.message:'Could not save boards.');}finally{setBusy(false);}}
 return <View style={{gap:8}}>
  <View testID="board-toolbar" style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10}}><OverlayMenu theme={theme} title="Manage boards" preferredWidth={420} maxHeight={520} open={open} onOpenChange={setOpen} trigger={toggle=><IconAction dense theme={theme} label={open?'Close saved boards':'Manage boards'} icon="PanelsTopLeft" align="left" onPress={toggle}/>}>
  <View style={{gap:10}}>
   <Text style={{color:c.foregroundMuted,fontSize:12}}>Save boards from this Jira site. Board selection is shared on this host; credentials and project mappings stay the same.</Text>
   <TextInput accessibilityLabel="Board name" value={name} onChangeText={setName} maxLength={80} placeholder="Board name" placeholderTextColor={c.foregroundMuted} style={{minHeight:44,color:c.foreground,padding:10,borderWidth:1,borderColor:c.border,borderRadius:radii.control}}/>
   <TextInput accessibilityLabel="Board URL" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder={current} placeholderTextColor={c.foregroundMuted} style={{minHeight:44,color:c.foreground,padding:10,borderWidth:1,borderColor:c.border,borderRadius:radii.control}}/>
   <Action theme={theme} label="Save board" icon="Save" disabled={busy||settings.saving||!name.trim()} onPress={()=>void save(()=>addSavedBoard(config,name,url||current))}/>
   {boards.map(board=><Action key={board.url} theme={theme} label={`Remove saved board: ${board.name}`} icon="Trash2" disabled={busy||settings.saving} onPress={()=>void save(()=>({...config,savedBoards:config.savedBoards.filter(b=>b.url!==board.url)}))}/>)}
  </View>
  {error?<Text accessibilityRole="alert" style={{color:c.statusDanger}}>{error}</Text>:null}
</OverlayMenu><View testID="board-selector" style={{maxWidth:'100%',flexShrink:1}}><ResponsiveSelect theme={theme} compact={compact} inline label="Board" value={current} options={options} disabled={busy||settings.saving} onValueChange={value=>void save(()=>selectSavedBoard(config,value),true)}/></View>{children}</View>

 </View>;
}
