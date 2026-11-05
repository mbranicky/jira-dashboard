import {Text} from 'react-native';
import type {PluginScreenProps} from '@getpaseo/plugin/client';
import type {MatchRange} from '../shared/search-highlights';
/** Nested text keeps the original wrapping, selectable text and accessible card label. */
export function SearchHighlight({text,ranges,theme}:{text:string;ranges:MatchRange[];theme:PluginScreenProps['theme']}){
 let end=0;
 const parts=ranges.flatMap(range=>{
  const plain=text.slice(end,range.start);end=range.end;
  return [plain,<Text key={range.start} testID="search-match" style={{backgroundColor:theme.colors.accent,color:theme.colors.accentForeground,fontWeight:'700'}}>{text.slice(range.start,range.end)}</Text>];
 });
 return <>{parts}{text.slice(end)}</>;
}
