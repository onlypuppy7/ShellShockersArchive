// The file index lists inclusive ranges in capture-time order, not version order.
export function donorIndex(ranges,selected){
  let before=-1,after=Infinity;
  for(let n=0;n<ranges.length;n+=2){
    const first=ranges[n],last=ranges[n+1];
    if(first<selected)before=Math.max(before,Math.min(last,selected-1));
    if(last>selected)after=Math.min(after,Math.max(first,selected+1));
  }
  return before>=0?before:Number.isFinite(after)?after:-1;
}

// Prefer a known pair for unchanged geometry. Otherwise use the latest paired
// map before the client capture, or the first later pair if none existed yet.
export function mapPair(candidates,selectedTime,currentHash){
  const valid=candidates.filter(pair=>Number.isFinite(pair.time)&&Number.isFinite(pair.gap)&&pair.gap<=7*86400&&pair.gap>=0);
  const matching=valid.filter(pair=>pair.map.sha256===currentHash);
  const pool=matching.length?matching:valid;
  const previous=pool.filter(pair=>pair.time<=selectedTime);
  return (previous.length?previous.sort((a,b)=>b.time-a.time||a.gap-b.gap):pool.slice().sort((a,b)=>a.time-b.time||a.gap-b.gap))[0]||null;
}
