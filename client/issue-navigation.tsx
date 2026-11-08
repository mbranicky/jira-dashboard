import {Text,View} from 'react-native';
import {IconAction} from './icon-action';
import type {SettingsTheme} from './settings-ui';
export type IssueNavigationProps={position:number;total:number;onPrevious?:()=>void;onNext?:()=>void};
export function IssueNavigation({theme,position,total,onPrevious,onNext}:IssueNavigationProps&{theme:SettingsTheme}){
 return <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
  <IconAction theme={theme} label="Previous issue" icon="ChevronLeft" disabled={!onPrevious} onPress={()=>onPrevious?.()}/>
  <Text accessibilityLiveRegion="polite" style={{fontSize:12,color:theme.colors.foregroundMuted,fontVariant:['tabular-nums']}}>{position>0?`${position} of ${total}`:'Outside current filters'}</Text>
  <IconAction theme={theme} label="Next issue" icon="ChevronRight" disabled={!onNext} onPress={()=>onNext?.()}/>
 </View>;
}
