import {Text,View} from 'react-native';
import {Icon} from '@getpaseo/plugin/client/ui';

// Fixed contrasting pairs keep Jira's priority hues readable in every host theme.
// The label and single/double chevrons convey priority without relying on color.
export function priorityStyle(priority:string){
 const name=priority.trim().toLowerCase();
 const highest=/^(highest|critical|blocker)$/.test(name);
 const high=highest||name==='high';
 const lowest=name==='lowest';
 const low=lowest||name==='low';
 const medium=/^(medium|normal)$/.test(name);
 const color=high?'#FF8B73':low?'#70ADFF':medium?'#FFBF47':'#D4DAE3';
 const backgroundColor=high?'#492820':low?'#17365C':medium?'#443414':'#343B46';
 const icon=highest?'ChevronsUp':high?'ChevronUp':lowest?'ChevronsDown':low?'ChevronDown':medium?'Equal':'Minus';
 return {color,backgroundColor,icon};
}
export function PriorityBadge({priority}:{priority:string}){
 const {color,backgroundColor,icon}=priorityStyle(priority);
 return <View accessibilityLabel={`Priority: ${priority}`} style={{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:8,paddingVertical:4,borderRadius:999,backgroundColor,maxWidth:'100%',flexShrink:1}}>
  <Icon name={icon} size={15} color={color}/>
  <Text style={{color,fontSize:12,fontWeight:'600',flexShrink:1}}>{priority}</Text>
 </View>;
}
