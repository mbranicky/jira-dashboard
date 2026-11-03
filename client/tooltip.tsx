import {useState} from 'react';
import {Platform,Text,View,useWindowDimensions} from 'react-native';
import type {SettingsTheme} from './settings-ui';

// Shared presentation for every plugin-owned tooltip; the trigger owns visibility.
export function Tooltip({theme,text,align='right',placement='above',offset=44}:{theme:SettingsTheme;text:string;align?:'left'|'right';placement?:'above'|'below';offset?:number}){
 const {width}=useWindowDimensions();
 const [measuredWidth,setMeasuredWidth]=useState<number>();
 const web=Platform.OS==='web';
 return <View pointerEvents="none" style={{position:'absolute',...(align==='left'?{left:0}:{right:0}),...(placement==='above'?{bottom:offset}:{top:offset}),width:web?'max-content' as any:measuredWidth??Math.min(280,width-24),maxWidth:Math.min(280,width-24),paddingHorizontal:8,paddingVertical:4,borderRadius:5,backgroundColor:theme.colors.foreground,zIndex:10,opacity:web||measuredWidth?1:0}}>
  <Text onTextLayout={web?undefined:event=>{const content=Math.max(0,...event.nativeEvent.lines.map(line=>line.width));setMeasuredWidth(Math.ceil(content)+16);}} style={{color:theme.colors.surface0,fontSize:12,lineHeight:16,textAlign:'left',fontWeight:'400'}}>{text}</Text>
 </View>;
}
