import {Text,View} from 'react-native';
import {IconAction} from './icon-action';
import type {SettingsTheme} from './settings-ui';
export type IssueNavigationProps={focusDirection?:'previous'|'next';position:number;total:number;onPrevious?:()=>void;onNext?:()=>void};
export function IssueNavigation({theme,position,total,onPrevious,onNext,focusDirection}:IssueNavigationProps&{theme:SettingsTheme}){
 return <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
  <IconAction dense theme={theme} focusOnMount={focusDirection==='previous'&&!!onPrevious||focusDirection==='next'&&!onNext&&!!onPrevious} label="Previous issue" icon="ChevronLeft" disabled={!onPrevious} onPress={()=>onPrevious?.()}/>
  <Text accessibilityLiveRegion="polite" style={{fontSize:12,color:theme.colors.foregroundMuted,fontVariant:['tabular-nums']}}>{position>0?`${position} of ${total}`:'Outside current filters'}</Text>
  <IconAction dense theme={theme} focusOnMount={focusDirection==='next'&&!!onNext||focusDirection==='previous'&&!onPrevious&&!!onNext} label="Next issue" icon="ChevronRight" disabled={!onNext} onPress={()=>onNext?.()}/>
 </View>;
}
