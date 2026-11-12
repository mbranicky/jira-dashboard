import {IconAction} from './icon-action';
import {radii} from './radii';
import {menuPosition} from '../shared/menu-position';
import {FocusScope} from './focus-scope';
import {useRef,useEffect,type ReactNode} from 'react';
import {Modal,Platform,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {useState} from 'react';
import type {SettingsTheme} from './settings-ui';

// Portaled overlay: never participates in the page's layout or gets clipped by a ScrollView.
export function OverlayMenu({open,onOpenChange,theme,trigger,children,maxHeight=260,preferredWidth,align='start',title}:{open:boolean;onOpenChange:(open:boolean)=>void;theme:SettingsTheme;trigger:(toggle:()=>void)=>ReactNode;children:ReactNode;maxHeight?:number;preferredWidth?:number;align?:'start'|'end';title?:string}){
 const webRoot=Platform.OS==='web'?{dataSet:{jiraOverlayRoot:'true'}}:{};
 const anchor=useRef<View>(null),viewport=useWindowDimensions();
 const [rect,setRect]=useState({x:12,y:12,width:240,height:44});
 function show(){if(open){onOpenChange(false);return;}anchor.current?.measureInWindow((x,y,width,height)=>{setRect({x,y,width,height});onOpenChange(true);});}
 useEffect(()=>{if(open)anchor.current?.measureInWindow((x,y,width,height)=>setRect({x,y,width,height}));},[open,viewport.width,viewport.height]);
 const position=menuPosition(rect,viewport,maxHeight,{width:preferredWidth,align});
 return <View ref={anchor} collapsable={false}>
  {trigger(show)}
  {open?<Modal {...webRoot} visible transparent animationType="none" onRequestClose={()=>onOpenChange(false)}>
   {/* Keep focus activation immediate. The scoped web transition in FocusScope
       owns motion so host embellishments do not animate/copy this full-screen layer. */}
   <FocusScope><View style={{flex:1}}>
    <Pressable accessibilityRole="button" accessibilityLabel={title?`Dismiss ${title}`:"Close dropdown"} onPress={()=>onOpenChange(false)} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
    <View testID={title?`popover-${title}`:undefined} role={title?'dialog':undefined} accessibilityLabel={title} style={{position:'absolute',...position,minHeight:0,backgroundColor:theme.colors.surface1,borderWidth:1,borderColor:theme.colors.border,borderRadius:radii.overlay,overflow:'hidden',boxShadow:'0 8px 28px rgba(0,0,0,0.2)'}}>{title?<><View style={{paddingLeft:12,paddingRight:4,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:theme.colors.border}}><Text style={{flex:1,fontSize:14,color:theme.colors.foreground}}>{title}</Text><IconAction dense theme={theme} label={`Close ${title}`} icon="X" onPress={()=>onOpenChange(false)}/></View><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{flexShrink:1,minHeight:0}} contentContainerStyle={{padding:12,gap:10}}>{children}</ScrollView></>:children}</View>
   </View></FocusScope>
  </Modal>:null}
 </View>;
}
