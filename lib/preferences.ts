export type LocationMode='off'|'ask'|'approximate'|'precise';
export type SpeechLanguage='auto'|'no'|'en';
export type AppPreferences={locationMode:LocationMode;microphoneEnabled:boolean;speechLanguage:SpeechLanguage};
export const DEFAULT_PREFERENCES:AppPreferences={
 locationMode:'ask',microphoneEnabled:true,speechLanguage:'auto',
};
export function isLocationMode(value:unknown):value is LocationMode{
 return value==='off'||value==='ask'||value==='approximate'||value==='precise';
}
export function isSpeechLanguage(value:unknown):value is SpeechLanguage{
 return value==='auto'||value==='no'||value==='en';
}
