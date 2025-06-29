export function renderFrameRailHTML(list, current) {
  return list.map((data,i)=>`<img class='thumb ${i===current?'active':''}' data-idx='${i}' src='${data||''}' alt='frame ${i}'>`).join('');
}
