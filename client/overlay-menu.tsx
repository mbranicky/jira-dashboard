import {menuPosition} from '../shared/menu-position';
import {FocusScope} from './focus-scope';
import {useRef,type ReactNode} from 'react';
import {Modal,Pressable,View,useWindowDimensions} from 'react-native';
import {useState} from 'react';
import type {SettingsTheme} from './settings-ui';

// Portaled overlay: never participates in the page's layout or gets clipped by a ScrollView.
export function OverlayMenu({open,onOpenChange,theme,trigger,children,maxHeight=260}:{open:boolean;onOpenChange:(open:boolean)=>void;theme:SettingsTheme;trigger:(toggle:()=>void)=>ReactNode;children:ReactNode;maxHeight?:number}){
 const anchor=useRef<View>(null),viewport=useWindowDimensions();
 const [rect,setRect]=useState({x:12,y:12,width:240,height:44});
 function show(){if(open){onOpenChange(false);return;}anchor.current?.measureInWindow((x,y,width,height)=>{setRect({x,y,width,height});onOpenChange(true);});}
 const position=menuPosition(rect,viewport,maxHeight);
 return <View ref={anchor} collapsable={false}>
  {trigger(show)}
  {open?<Modal visible transparent animationType="none" onRequestClose={()=>onOpenChange(false)}>
   <FocusScope><View style={{flex:1}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Close dropdown" onPress={()=>onOpenChange(false)} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
    <View style={{position:'absolute',...position,minHeight:0,backgroundColor:theme.colors.surface1,borderWidth:1,borderColor:theme.colors.border,borderRadius:8,overflow:'hidden',boxShadow:'0 8px 28px rgba(0,0,0,0.2)'}}>{children}</View>
   </View></FocusScope>
  </Modal>:null}
 </View>;
}
