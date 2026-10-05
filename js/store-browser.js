/* The Signature Comic Store — store browser (js/store-browser.js).
   Moved off the front door (index.html) onto the 1 Million Archive tab
   (browse.html) on 2026-10-05 per the standing architecture rule: the
   million-file A-Z list lives ONLY on the archive tab, never on the first
   page. Same components, no redesign.

   Adaptations vs the front-door original (kept minimal):
   - record/hero "take me there" targets deep-link to index.html
     (?comic= / #issue= / #hero=), which still hosts the detail views.
   - the series-band loader only fills the band + filters (browse.html
     stamps its own count line).
   Requires hero-catalog.js BEFORE this file (loadHeroes/myHeroes/mySeries).
   Inline onclick handlers below need these globals (no IIFE). */
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*16777619)>>>0}return h}
function wrapTitle(t,maxw){var words=String(t).split(/\s+/),lines=[],cur="";
  words.forEach(function(w){if((cur+" "+w).trim().length>maxw){if(cur)lines.push(cur);cur=w}else cur=(cur+" "+w).trim()});
  if(cur)lines.push(cur);return lines.slice(0,4)}
/* Painted cover system (2026-10-03): per-issue covers composite the painted
   series base art (assets/covers/cover-<skey>.jpg, original Signature heroes,
   painted comic-book style) with the issue number + title in bold comic
   typography. Deterministic per issue: same issue always shows the same cover.
   If the painted art fails to load (offline), coverFallback swaps in the
   classic SVG cover. The classic generator is kept as coverSVGClassic. */
function rnd2(h,n){h=(h*1103515245+12345)>>>0;return{h:h,v:h%n}}
/* ============ painted-panel system (2026-10-04) ============
   Manon's order: interior page art must look like the painted covers.
   "painted-panel" marker. Deterministic client-side SVG — same inputs always
   produce the same art. Phone-performant: one feTurbulence filter per panel,
   modest primitive counts. Gradient ids derive from the inputs (hash), so
   identical inputs share identical defs — no cross-render drift. */
function shade(hex,amt){
  var m=/^#([0-9a-fA-F]{6})$/.exec(hex||"");if(!m)return hex;
  var n=parseInt(m[1],16),d=Math.round(amt*2.55);
  function c(v){v+=d;return v<0?0:(v>255?255:v)}
  var r=c((n>>16)&255),g=c((n>>8)&255),b=c(n&255);
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
/* Painted hero figure. Same signature as before (x,y,s,col,cape,flip);
   optional 7th arg pose: "stand" | "stride" | "leap" (defaults
   deterministically from the colors when omitted). Layered gradient
   shading, rim light, flowing cape, painted cowl — no capsule rects. */
function figureSVG(x,y,s,col,cape,flip,pose){
  if(!pose){var ph0=hashStr(col+cape);pose=["stand","stride","leap"][ph0%3]}
  var f=flip?-1:1,u="pp"+(hashStr(x+","+y+","+s+","+col+cape+(flip?1:0)+pose)%100000),out="";
  var suitD=shade(col,-42),suitDD=shade(col,-68),suitL=shade(col,44);
  var capD=shade(cape,-46),capDD=shade(cape,-74),capL=shade(cape,38);
  var skin=shade("#e8b88a",-16);
  out+='<defs>'+
   '<linearGradient id="'+u+'t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="'+suitL+'"/><stop offset="0.45" stop-color="'+col+'"/><stop offset="1" stop-color="'+suitD+'"/></linearGradient>'+
   '<linearGradient id="'+u+'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'"/><stop offset="1" stop-color="'+suitDD+'"/></linearGradient>'+
   '<linearGradient id="'+u+'c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="'+capL+'"/><stop offset="0.5" stop-color="'+cape+'"/><stop offset="1" stop-color="'+capD+'"/></linearGradient>'+
   '<radialGradient id="'+u+'m" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#ffd76a"/><stop offset="0.55" stop-color="#e8a83c"/><stop offset="1" stop-color="#8a5a18"/></radialGradient>'+
   '<radialGradient id="'+u+'h" cx="0.4" cy="0.35" r="0.85"><stop offset="0" stop-color="'+suitL+'"/><stop offset="1" stop-color="'+suitD+'"/></radialGradient>'+
   '</defs>';
  out+='<g transform="translate('+x+','+y+') scale('+(f*s)+','+s+')">';
  out+='<ellipse cx="0" cy="5" rx="48" ry="9" fill="#000" opacity="0.42"/>';
  /* ---- cape (behind body) ---- */
  if(pose==="leap"){
    out+='<path d="M-12,-116 C-52,-112 -92,-96 -118,-64 C-96,-60 -78,-52 -64,-38 C-44,-58 -28,-88 -12,-116 Z" fill="url(#'+u+'c)" opacity="0.97"/>';
    out+='<path d="M-14,-116 C-50,-108 -84,-92 -104,-66" fill="none" stroke="'+capDD+'" stroke-width="4" opacity="0.7"/>';
    out+='<path d="M-12,-116 C-44,-104 -72,-84 -88,-60" fill="none" stroke="'+capL+'" stroke-width="2.5" opacity="0.65"/>';
    out+='<path d="M-10,-116 C-38,-96 -52,-66 -56,-34 C-44,-52 -30,-80 -10,-116 Z" fill="'+capD+'" opacity="0.55"/>';
  }else{
    out+='<path d="M-13,-118 C-40,-102 -54,-64 -50,-12 C-48,4 -38,8 -32,2 C-42,-32 -40,-84 -13,-118 Z" fill="url(#'+u+'c)" opacity="0.97"/>';
    out+='<path d="M13,-118 C40,-102 54,-64 50,-12 C48,4 38,8 32,2 C42,-32 40,-84 13,-118 Z" fill="'+capD+'" opacity="0.5"/>';
    out+='<path d="M-22,-100 C-34,-70 -36,-38 -32,-6" fill="none" stroke="'+capDD+'" stroke-width="4" opacity="0.7"/>';
    out+='<path d="M-16,-104 C-28,-74 -30,-42 -26,-10" fill="none" stroke="'+capL+'" stroke-width="2.5" opacity="0.6"/>';
  }
  var rot=pose==="leap"?-16:(pose==="stride"?-7:0);
  out+='<g transform="rotate('+rot+')">';
  /* ---- legs ---- */
  if(pose==="leap"){
    out+='<path d="M-8,-54 C-26,-44 -44,-30 -58,-12 L-48,-2 C-34,-18 -18,-30 -4,-40 Z" fill="url(#'+u+'l)"/>';
    out+='<path d="M8,-54 C20,-44 28,-30 30,-14 C24,-8 16,-8 12,-14 C10,-28 6,-42 0,-52 Z" fill="url(#'+u+'l)"/>';
    out+='<path d="M-58,-12 l-13,4 l3,9 l13,-4 Z" fill="'+suitDD+'"/>';
    out+='<path d="M30,-14 l11,2 l-1,10 l-11,-2 Z" fill="'+suitDD+'"/>';
  }else if(pose==="stride"){
    out+='<path d="M-14,-54 C-24,-36 -30,-18 -32,0 L-20,0 C-18,-18 -12,-36 -4,-52 Z" fill="url(#'+u+'l)"/>';
    out+='<path d="M10,-54 C18,-36 24,-18 26,0 L14,0 C12,-18 8,-36 2,-52 Z" fill="url(#'+u+'l)"/>';
    out+='<path d="M-32,-13 L-20,-13 L-20,0 L-34,0 Z" fill="'+suitDD+'"/>';
    out+='<path d="M14,-13 L26,-13 L26,0 L14,0 Z" fill="'+suitDD+'"/>';
  }else{
    out+='<path d="M-17,-54 C-20,-36 -20,-18 -18,0 L-6,0 C-8,-18 -8,-36 -6,-52 Z" fill="url(#'+u+'l)"/>';
    out+='<path d="M7,-54 C10,-36 10,-18 8,0 L20,0 C22,-18 20,-36 16,-52 Z" fill="url(#'+u+'l)"/>';
    out+='<path d="M-18,-13 L-6,-13 L-6,0 L-20,0 Z" fill="'+suitDD+'"/>';
    out+='<path d="M8,-13 L20,-13 L22,0 L8,0 Z" fill="'+suitDD+'"/>';
  }
  out+='<path d="M-17,-50 C-19,-34 -19,-18 -17,-4" fill="none" stroke="#fff" stroke-width="2" opacity="0.35"/>';
  /* ---- torso ---- */
  out+='<path d="M-21,-110 C-27,-92 -25,-72 -18,-54 L18,-54 C25,-72 27,-92 21,-110 C12,-119 -12,-119 -21,-110 Z" fill="url(#'+u+'t)"/>';
  out+='<path d="M-16,-102 C-8,-98 -8,-88 -15,-84 C-20,-88 -21,-96 -16,-102 Z" fill="'+suitD+'" opacity="0.45"/>';
  out+='<path d="M16,-102 C8,-98 8,-88 15,-84 C20,-88 21,-96 16,-102 Z" fill="'+suitDD+'" opacity="0.5"/>';
  out+='<path d="M-8,-80 L8,-80 M-7,-70 L7,-70" stroke="'+suitDD+'" stroke-width="2.4" opacity="0.65" fill="none"/>';
  out+='<path d="M-21,-108 C-26,-92 -24,-74 -19,-58" fill="none" stroke="#fff" stroke-width="2.4" opacity="0.4"/>';
  out+='<path d="M-19,-60 L19,-60 L18,-52 L-18,-52 Z" fill="#14100c"/>';
  out+='<circle cx="0" cy="-92" r="9" fill="url(#'+u+'m)" stroke="'+suitDD+'" stroke-width="2"/>';
  out+='<circle cx="-2.5" cy="-94.5" r="2.6" fill="#fff" opacity="0.75"/>';
  /* ---- arms ---- */
  if(pose==="leap"){
    out+='<path d="M18,-104 C32,-100 46,-94 58,-86 L54,-76 C42,-84 30,-90 18,-94 Z" fill="url(#'+u+'t)"/>';
    out+='<circle cx="60" cy="-81" r="8" fill="url(#'+u+'h)"/>';
    out+='<path d="M-19,-104 C-30,-96 -36,-84 -38,-70 L-29,-67 C-27,-80 -22,-92 -15,-100 Z" fill="url(#'+u+'t)"/>';
    out+='<circle cx="-34" cy="-63" r="7.4" fill="url(#'+u+'h)"/>';
  }else if(pose==="stride"){
    out+='<path d="M-20,-104 C-32,-96 -38,-82 -40,-66 L-31,-63 C-29,-78 -24,-92 -16,-100 Z" fill="url(#'+u+'t)"/>';
    out+='<circle cx="-36" cy="-59" r="7.4" fill="url(#'+u+'h)"/>';
    out+='<path d="M20,-104 C30,-96 36,-82 38,-66 L29,-63 C27,-78 22,-92 15,-100 Z" fill="url(#'+u+'t)"/>';
    out+='<circle cx="34" cy="-59" r="7.4" fill="url(#'+u+'h)"/>';
  }else{
    out+='<path d="M-20,-104 C-29,-94 -33,-80 -34,-64 L-25,-62 C-24,-78 -20,-92 -14,-100 Z" fill="url(#'+u+'t)"/>';
    out+='<circle cx="-30" cy="-57" r="7.4" fill="url(#'+u+'h)"/>';
    out+='<path d="M20,-104 C26,-94 28,-80 27,-66 C22,-64 17,-64 14,-66 C15,-80 14,-94 10,-102 Z" fill="url(#'+u+'t)" opacity="0.92"/>';
    out+='<circle cx="21" cy="-60" r="7" fill="url(#'+u+'h)"/>';
  }
  out+='<path d="M-21,-100 C-28,-90 -31,-78 -32,-66" fill="none" stroke="#fff" stroke-width="2" opacity="0.35"/>';
  /* ---- head: painted cowl ---- */
  out+='<path d="M-7,-118 L7,-118 L6,-110 L-6,-110 Z" fill="'+suitD+'"/>';
  out+='<path d="M-14,-142 C-14,-156 14,-156 14,-142 C14,-130 8,-121 0,-121 C-8,-121 -14,-130 -14,-142 Z" fill="url(#'+u+'h)"/>';
  out+='<path d="M-8.5,-142 C-8.5,-149 8.5,-149 8.5,-142 C8.5,-135 4,-131 0,-131 C-4,-131 -8.5,-135 -8.5,-142 Z" fill="'+skin+'"/>';
  out+='<path d="M4,-156 C10,-152 13,-146 13,-138 C9,-134 5,-132 2,-132 C7,-140 7,-149 4,-156 Z" fill="'+suitDD+'" opacity="0.55"/>';
  out+='<rect x="-9.5" y="-144" width="19" height="6.4" rx="3.2" fill="#f4f8ff" opacity="0.95"/>';
  out+='<rect x="-9.5" y="-144" width="19" height="2.6" rx="1.3" fill="#fff" opacity="0.9"/>';
  out+='<path d="M-13,-150 C-14,-142 -12,-134 -8,-128" fill="none" stroke="#fff" stroke-width="2" opacity="0.4"/>';
  out+='<path d="M-11,-152 L-16,-166 L-6,-156 Z" fill="'+suitD+'"/>';
  out+='<path d="M11,-152 L16,-166 L6,-156 Z" fill="'+suitD+'"/>';
  out+='</g>';
  out+='</g>';
  return out;
}
/* Painted backgrounds. Same signature + return contract ({svg,h}) as before;
   same scene-family routing — but layered atmospheric painting: depth layers,
   haloed moons, nebulae, mist, one feTurbulence grain + vignette per panel. */
function bgSVG(h,pal,W,H,scene){
  var s=scene.toLowerCase(),seed0=h,out="",r;
  var g1="bg"+(seed0%999983),hz="hz"+(seed0%999979),vg="vg"+(seed0%999971),gr="gr"+(seed0%999967);
  var bgD=shade(pal.bg[0],-26);
  out+='<defs>'+
   '<linearGradient id="'+g1+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+pal.bg[0]+'"/><stop offset="0.55" stop-color="'+pal.bg[1]+'"/><stop offset="1" stop-color="'+bgD+'"/></linearGradient>'+
   '<radialGradient id="'+hz+'" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="'+pal.acc+'" stop-opacity="0.55"/><stop offset="1" stop-color="'+pal.acc+'" stop-opacity="0"/></radialGradient>'+
   '<radialGradient id="'+vg+'" cx="0.5" cy="0.46" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient>'+
   '<filter id="'+gr+'" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0"/></filter>'+
   '</defs>';
  out+='<rect width="'+W+'" height="'+H+'" fill="url(#'+g1+')"/>';
  var i,b;
  if(/orbit|space|void|dark|star|moon|beacon|relay|array/.test(s)){
    var neb="neb"+(seed0%999953);
    out+='<defs><radialGradient id="'+neb+'" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="'+pal.acc+'" stop-opacity="0.28"/><stop offset="1" stop-color="'+pal.acc+'" stop-opacity="0"/></radialGradient></defs>';
    r=rnd2(h,1000);h=r.h;var nx1=r.v%W,ny1=(r.v>>3)%H;
    r=rnd2(h,1000);h=r.h;var nx2=r.v%W,ny2=(r.v>>3)%H;
    out+='<ellipse cx="'+nx1+'" cy="'+ny1+'" rx="'+(W*0.42).toFixed(0)+'" ry="'+(H*0.3).toFixed(0)+'" fill="url(#'+neb+')"/>';
    out+='<ellipse cx="'+nx2+'" cy="'+ny2+'" rx="'+(W*0.3).toFixed(0)+'" ry="'+(H*0.22).toFixed(0)+'" fill="url(#'+neb+')" opacity="0.7"/>';
    for(i=0;i<80;i++){r=rnd2(h,1000000);h=r.h;var sx=r.v%W;r=rnd2(h,1000000);h=r.h;var sy=r.v%H;
      out+='<circle cx="'+sx+'" cy="'+sy+'" r="'+(0.6+(r.v%23)/10).toFixed(1)+'" fill="#fff" opacity="'+(0.3+(r.v%60)/100).toFixed(2)+'"/>'}
    r=rnd2(h,1000);h=r.h;var px=W*0.74,py=H*0.24,pr=38+r.v%34;
    out+='<circle cx="'+px.toFixed(0)+'" cy="'+py.toFixed(0)+'" r="'+(pr*2.1).toFixed(0)+'" fill="url(#'+hz+')"/>';
    out+='<circle cx="'+px.toFixed(0)+'" cy="'+py.toFixed(0)+'" r="'+pr+'" fill="'+pal.acc+'"/>';
    out+='<circle cx="'+(px-pr*0.38).toFixed(0)+'" cy="'+(py-pr*0.3).toFixed(0)+'" r="'+(pr*0.86).toFixed(0)+'" fill="'+pal.bg[0]+'" opacity="0.62"/>';
    out+='<ellipse cx="'+(px-pr*0.3).toFixed(0)+'" cy="'+(py-pr*0.34).toFixed(0)+'" rx="'+(pr*0.3).toFixed(0)+'" ry="'+(pr*0.18).toFixed(0)+'" fill="#fff" opacity="0.35"/>';
  }else if(/row|alley|sector|city|market|lane|square|plaza|docks|rooftop/.test(s)){
    var mx=W*0.2,my=H*0.18,mr=26;
    out+='<circle cx="'+mx+'" cy="'+my+'" r="'+(mr*2.6).toFixed(0)+'" fill="url(#'+hz+')"/>';
    out+='<circle cx="'+mx+'" cy="'+my+'" r="'+mr+'" fill="'+pal.acc+'" opacity="0.9"/>';
    var layers=[[8,shade(pal.bg[1],26),0.75,0.2],[7,shade(pal.bg[1],-6),0.9,0.34],[6,"#05040a",1,0.5]];
    for(var L=0;L<3;L++){var ln=layers[L][0],lc=layers[L][1],lo=layers[L][2],lm=layers[L][3];
      for(b=0;b<ln;b++){r=rnd2(h,1000);h=r.h;
        var bw=W/ln,bh=H*(lm*0.5)+(r.v%(H*lm*0.7)),bx=b*bw+(r.v%8);
        out+='<rect x="'+bx.toFixed(0)+'" y="'+(H-bh).toFixed(0)+'" width="'+(bw-3).toFixed(0)+'" height="'+bh.toFixed(0)+'" fill="'+lc+'" opacity="'+lo+'"/>';
        if(L===2){for(var wy=H-bh+12;wy<H-10;wy+=26){for(var wx=bx+6;wx<bx+bw-10;wx+=18){
          r=rnd2(h,100);h=r.h;if(r.v%10<6)out+='<rect x="'+wx.toFixed(0)+'" y="'+wy.toFixed(0)+'" width="5" height="7" fill="'+(r.v%10<2?pal.acc:"#ffd98a")+'" opacity="'+(0.35+(r.v%40)/100).toFixed(2)+'"/>'}}}}}
    out+='<rect x="0" y="'+(H*0.72).toFixed(0)+'" width="'+W+'" height="'+(H*0.28).toFixed(0)+'" fill="'+pal.acc+'" opacity="0.06"/>';
  }else if(/water|tide|coral|drowned|sea|harbor|ocean|skerry|gull/.test(s)){
    var qx=W*0.8,qy=H*0.16,qr=30;
    out+='<circle cx="'+qx+'" cy="'+qy+'" r="'+(qr*2.6).toFixed(0)+'" fill="url(#'+hz+')"/>';
    out+='<circle cx="'+qx+'" cy="'+qy+'" r="'+qr+'" fill="'+pal.acc+'" opacity="0.95"/>';
    out+='<path d="M'+(qx-16)+','+(qy+qr)+' L'+(qx+16)+','+(qy+qr)+' L'+(qx+34)+','+H+' L'+(qx-34)+','+H+' Z" fill="'+pal.acc+'" opacity="0.18"/>';
    for(var wv=0;wv<5;wv++){var wyy=H*0.42+wv*52,wg="wv"+(seed0%999931)+wv;
      out+='<defs><linearGradient id="'+wg+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+shade(pal.bg[1],22)+'"/><stop offset="1" stop-color="'+pal.bg[0]+'"/></linearGradient></defs>';
      out+='<path d="M0,'+wyy.toFixed(0)+' Q80,'+(wyy-24).toFixed(0)+' 160,'+wyy.toFixed(0)+' T320,'+wyy.toFixed(0)+' T480,'+wyy.toFixed(0)+' T640,'+wyy.toFixed(0)+' L640,'+(wyy+40).toFixed(0)+' L0,'+(wyy+40).toFixed(0)+' Z" fill="url(#'+wg+')" opacity="'+(0.85-wv*0.12).toFixed(2)+'"/>';
      out+='<path d="M0,'+wyy.toFixed(0)+' Q80,'+(wyy-24).toFixed(0)+' 160,'+wyy.toFixed(0)+' T320,'+wyy.toFixed(0)+' T480,'+wyy.toFixed(0)+' T640,'+wyy.toFixed(0)+'" fill="none" stroke="'+pal.acc+'" stroke-width="2.4" opacity="'+(0.5-wv*0.08).toFixed(2)+'"/>'}
    out+='<ellipse cx="'+(W/2)+'" cy="'+(H*0.4).toFixed(0)+'" rx="'+(W*0.55).toFixed(0)+'" ry="26" fill="#fff" opacity="0.08"/>';
  }else if(/vale|forest|fen|pine|tree|park|field|mountain|ashen/.test(s)){
    var ridgeCols=[shade(pal.bg[1],30),shade(pal.bg[1],6),"#04140a"];
    for(var Rr=0;Rr<3;Rr++){var ry0=H*(0.52+Rr*0.13),pts="0,"+H+" 0,"+ry0.toFixed(0);
      for(var ex=0;ex<=W;ex+=80){r=rnd2(h,1000);h=r.h;pts+=" "+ex+","+(ry0-20-(r.v%(H*0.12))).toFixed(0)}
      pts+=" "+W+","+H;
      out+='<polygon points="'+pts+'" fill="'+ridgeCols[Rr]+'" opacity="'+(0.75+Rr*0.12).toFixed(2)+'"/>'}
    for(var t=0;t<10;t++){r=rnd2(h,1000);h=r.h;var tx=r.v%W,th=H*0.22+(r.v%(H*0.26));
      out+='<polygon points="'+tx+','+(H-th).toFixed(0)+' '+(tx-24)+','+H+' '+(tx+24)+','+H+'" fill="#020d06" opacity="0.94"/>';
      out+='<polygon points="'+tx+','+(H-th).toFixed(0)+' '+(tx-24)+','+H+' '+tx+','+H+'" fill="'+shade(pal.acc,-40)+'" opacity="0.14"/>'}
    out+='<rect x="0" y="'+(H*0.86).toFixed(0)+'" width="'+W+'" height="'+(H*0.14).toFixed(0)+'" fill="#020b05"/>';
    for(var mt=0;mt<16;mt++){r=rnd2(h,100000);h=r.h;
      out+='<circle cx="'+(r.v%W)+'" cy="'+(r.v%(H*0.7)).toFixed(0)+'" r="'+(1+(r.v%20)/10).toFixed(1)+'" fill="'+pal.acc+'" opacity="'+(0.25+(r.v%40)/100).toFixed(2)+'"/>'}
  }else if(/gear|brass|cog|furnace|works|tinker/.test(s)){
    for(var G=0;G<3;G++){r=rnd2(h,1000);h=r.h;var gx=r.v%W,gy=(r.v>>2)%H,grr=60+(r.v%70);
      out+='<circle cx="'+gx+'" cy="'+gy+'" r="'+grr+'" fill="none" stroke="'+shade(pal.acc,-30)+'" stroke-width="26" opacity="0.16"/>';
      out+='<circle cx="'+gx+'" cy="'+gy+'" r="'+grr+'" fill="none" stroke="'+pal.acc+'" stroke-width="3" opacity="0.3"/>';
      out+='<circle cx="'+gx+'" cy="'+gy+'" r="'+(grr*0.34).toFixed(0)+'" fill="'+shade(pal.bg[0],-20)+'" opacity="0.5"/>'}
    for(var gg=0;gg<6;gg++){r=rnd2(h,1000);h=r.h;var gx2=r.v%W,gy2=(r.v>>2)%H,g2r=22+(r.v%36);
      out+='<circle cx="'+gx2+'" cy="'+gy2+'" r="'+g2r+'" fill="none" stroke="'+pal.acc+'" stroke-width="8" opacity="0.42"/>';
      for(var tk=0;tk<8;tk++){var ta=tk*Math.PI/4;
        out+='<line x1="'+(gx2+Math.cos(ta)*(g2r+4)).toFixed(0)+'" y1="'+(gy2+Math.sin(ta)*(g2r+4)).toFixed(0)+'" x2="'+(gx2+Math.cos(ta)*(g2r+11)).toFixed(0)+'" y2="'+(gy2+Math.sin(ta)*(g2r+11)).toFixed(0)+'" stroke="'+pal.acc+'" stroke-width="5" opacity="0.42"/>'}
      out+='<circle cx="'+gx2+'" cy="'+gy2+'" r="'+(g2r*0.4).toFixed(0)+'" fill="none" stroke="'+pal.acc+'" stroke-width="3.4" opacity="0.42"/>'}
    for(var em=0;em<18;em++){r=rnd2(h,100000);h=r.h;
      out+='<circle cx="'+(r.v%W)+'" cy="'+(r.v%H).toFixed(0)+'" r="'+(1+(r.v%18)/10).toFixed(1)+'" fill="#ffca7a" opacity="'+(0.3+(r.v%50)/100).toFixed(2)+'"/>'}
  }else{
    r=rnd2(h,1000);h=r.h;
    var dx=W*(0.6+(r.v%30)/100),dy=H*0.2,dr=40+r.v%26;
    out+='<circle cx="'+dx.toFixed(0)+'" cy="'+dy.toFixed(0)+'" r="'+(dr*2.4).toFixed(0)+'" fill="url(#'+hz+')"/>';
    out+='<circle cx="'+dx.toFixed(0)+'" cy="'+dy.toFixed(0)+'" r="'+dr+'" fill="'+pal.acc+'" opacity="0.92"/>';
    for(var ri=0;ri<4;ri++){var ra2=-0.5+ri*0.28;
      out+='<polygon points="'+dx.toFixed(0)+','+dy.toFixed(0)+' '+(dx+Math.cos(ra2)*W).toFixed(0)+','+(dy+Math.sin(ra2)*H+80).toFixed(0)+' '+(dx+Math.cos(ra2+0.1)*W).toFixed(0)+','+(dy+Math.sin(ra2+0.1)*H+80).toFixed(0)+'" fill="#fff" opacity="0.05"/>'}
    for(var cl=0;cl<5;cl++){var cy2=H*(0.24+cl*0.13)+(cl%2)*14,cg2="cl"+(seed0%999929)+cl;
      out+='<defs><linearGradient id="'+cg2+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.34"/><stop offset="1" stop-color="'+pal.bg[0]+'" stop-opacity="0.1"/></linearGradient></defs>';
      out+='<ellipse cx="'+(W*(0.12+cl*0.19)).toFixed(0)+'" cy="'+cy2.toFixed(0)+'" rx="86" ry="'+(20+(cl%3)*7)+'" fill="url(#'+cg2+')"/>'}
  }
  /* one grain filter + vignette per panel */
  out+='<rect width="'+W+'" height="'+H+'" filter="url(#'+gr+')" opacity="0.055"/>';
  out+='<rect width="'+W+'" height="'+H+'" fill="url(#'+vg+')"/>';
  return{svg:out,h:h};
}
var COVERROWS={};
function coverFallback(id){
  var row=COVERROWS[id];if(!row)return;
  var el=document.getElementById(id);if(el)el.innerHTML=coverSVGClassic(row);
}
function coverSVG(row){
  var skey=row.sk||"signal",id="cv"+hashStr(row.id||"x");
  COVERROWS[id]={id:row.id,t:row.t,sk:skey,n:row.n};
  var pal=PALS[skey]||PALS.signal;
  var lines=wrapTitle(row.t||"",16),t="";
  lines.forEach(function(ln){t+='<div class="pct">'+esc(ln)+"</div>"});
  return '<div class="pcover" id="'+id+'">'+
   '<img src="assets/covers/cover-'+skey+'.jpg" alt="Painted cover art: '+esc(SNAME[skey]||"")+ '" loading="lazy" onerror="coverFallback(\''+id+'\')">'+
   '<div class="pc-top"><span>SIGNATURE</span></div>'+
   '<div class="pc-series" style="background:'+pal.acc+'">'+esc(SNAME[skey]||"")+'</div>'+
   '<div class="pc-titles">'+t+'</div>'+
   '<div class="pc-badge"><b>ISSUE</b><span>'+(row.n||"?")+'</span></div>'+
   '<div class="pc-foot"><span>'+esc(row.id||"")+'</span><span>ORIGINAL</span></div>'+
   "</div>";
}
function coverSVGClassic(row){
  var skey=row.sk||"signal",pal=PALS[skey]||PALS.signal,h=hashStr(row.id),W=400,H=600,r;
  var out='<svg viewBox="0 0 '+W+" "+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cover of '+esc(row.t)+'">';
  out+='<defs><linearGradient id="cbg'+(h%99991)+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+pal.bg[0]+'"/><stop offset="1" stop-color="'+pal.bg[1]+'"/></linearGradient></defs>';
  out+='<rect width="'+W+'" height="'+H+'" fill="url(#cbg'+(h%99991)+')"/>';
  var b=bgSVG(h^0x5f3,pal,W,H,(SNAME[skey]||"")+" cover");out+=b.svg;h=b.h;
  r=rnd2(h,100000);h=r.h;var cc="#"+(r.v%0xffffff).toString(16).padStart(6,"0");
  var cbG="cb"+(h%99989);
  out+='<defs><radialGradient id="'+cbG+'" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
  out+='<ellipse cx="'+(W/2)+'" cy="'+(H*0.48)+'" rx="170" ry="200" fill="url(#'+cbG+')"/>';
  out+=figureSVG(W/2,H*0.74,2.3,cc,pal.acc,false,"leap");
  out+='<rect x="0" y="0" width="'+W+'" height="64" fill="#000"/>';
  out+='<text x="'+(W/2)+'" y="42" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="34" letter-spacing="4" fill="'+pal.acc+'">SIGNATURE</text>';
  out+='<rect x="0" y="64" width="'+W+'" height="40" fill="'+pal.acc+'"/>';
  out+='<text x="'+(W/2)+'" y="93" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="22" letter-spacing="2" fill="#000">'+esc(SNAME[skey]||"")+"</text>";
  var lines=wrapTitle(row.t,14),ty=H*0.30;
  lines.forEach(function(ln,i){out+='<text x="'+(W/2)+'" y="'+(ty+i*44)+'" text-anchor="middle" font-family="Trebuchet MS,Arial,sans-serif" font-weight="900" font-size="38" fill="#fff" stroke="#000" stroke-width="1.4">'+esc(ln)+"</text>"});
  out+='<g transform="translate('+(W-78)+',120)"><circle r="34" fill="#ffd23f" stroke="#000" stroke-width="4"/><text y="-4" text-anchor="middle" font-family="Arial" font-weight="900" font-size="15" fill="#000">ISSUE</text><text y="18" text-anchor="middle" font-family="Arial" font-weight="900" font-size="22" fill="#000">'+(row.n||"?")+"</text></g>";
  out+='<rect x="0" y="'+(H-52)+'" width="'+W+'" height="52" fill="#000"/>';
  out+='<text x="14" y="'+(H-20)+'" font-family="Arial,sans-serif" font-size="14" fill="'+pal.ink+'" opacity="0.85">'+esc(row.id)+'</text>';
  out+='<text x="'+(W-14)+'" y="'+(H-20)+'" text-anchor="end" font-family="Arial,sans-serif" font-size="14" fill="'+pal.acc+'">ORIGINAL</text>';
  out+='<rect x="8" y="8" width="'+(W-16)+'" height="'+(H-16)+'" fill="none" stroke="#000" stroke-width="6"/>';
  return out+"</svg>";
}

var PALS={
 signal:{bg:["#0b1035","#1b2456"],acc:"#39d0ff",ink:"#f2f6ff"},
 ember:{bg:["#3a0f0a","#1c0705"],acc:"#ff7b2e",ink:"#ffeedd"},
 circuit:{bg:["#0a0a12","#161626"],acc:"#ff2fb3",ink:"#f2f2ff"},
 tide:{bg:["#062a3a","#041620"],acc:"#4fe3c1",ink:"#eafcf7"},
 gloam:{bg:["#221c33","#100d1a"],acc:"#ffd23f",ink:"#f4eefc"},
 starlog:{bg:["#0a1030","#1a1440"],acc:"#ffd23f",ink:"#eef2ff"},
 clockwork:{bg:["#2e1d0e","#171006"],acc:"#e8b64c",ink:"#f7ecd4"},
 junior:{bg:["#123a6b","#0a1f3d"],acc:"#ff9f1c",ink:"#ffffff"},
 event:{bg:["#2b0a3d","#0d0518"],acc:"#ff4fd8",ink:"#ffeefc"}};
var SDESC={
 signal:"A team of cosmic guardians keeps the beacon-network of the far colonies lit — and something out in the dark keeps trying to snuff it.",
 ember:"In a valley of ash and frost, young wardens carry living ember-flames between the last warm holds of the Vale.",
 circuit:"Neon-row couriers who dive the city's ghost frequencies discover a signal that was never meant to be heard.",
 tide:"Harbor kids and old sailors bound by tide-oaths guard the sea-roads between Gullrest and the drowned places.",
 gloam:"Lantern-keepers patrol the fog city after dark, solving the small strange mysteries the daylight misses.",
 starlog:"An anthology of voyages: the survey ship Wayfarer charts the far dark, one strange world per issue.",
 clockwork:"Tinkerers and their brass automatons keep the gear-city wound — and someone keeps loosening the springs.",
 junior:"The Maple Street kids and their treehouse club: small heroes, big heart, everyday wonders.",
 event:"Universe-shaking crossovers: the united heroes face apocalypse-level threats on Jupiter's first moon, in the dinosaur era, in the far future, and across collapsing timelines."};
var SNAME={signal:"THE SIGNALBEARERS",ember:"EMBERFALL",circuit:"THE HOLLOW CIRCUIT",tide:"TIDEBOUND",gloam:"THE GLOAMING WATCH",starlog:"STARFARER'S LOG",clockwork:"THE CLOCKWORK MENAGERIE",junior:"JUNIOR SIGNALS",event:"COSMIC CROSSOVER EVENTS"};

/* ============ deterministic comic art ============ */
var CHUNK=100, IDX_URL="data/index/comics.idx.json.gz", API_URL="data/index/api.json";
var IDX=[], FILTERED=[], SHOWN=0, PAGE=48;
function gunzip(buf){return new Response(buf).arrayBuffer().then(function(ab){
  if(typeof DecompressionStream==="undefined")throw new Error("no gzip support");
  return new Response(new Blob([ab]).stream().pipeThrough(new DecompressionStream("gzip"))).text()})}
function fetchJSONgz(url){return fetch(url).then(function(r){if(!r.ok)throw new Error("fetch "+r.status);return r.arrayBuffer()}).then(gunzip).then(JSON.parse)}

/* ============ series palettes ============ */
function buildSeriesPills(keys){
 var box=$("seriespills");if(!box)return;box.innerHTML="";
 var mk=function(lbl,val){var b=document.createElement("button");b.textContent=lbl;b.dataset.v=val;
  b.onclick=function(){$("series").value=val;syncPills();applyFilters()};box.appendChild(b)};
 mk("★ All","");keys.forEach(function(s){mk(s,s)});syncPills()}
function syncPills(){var box=$("seriespills");if(!box)return;var v=$("series").value;
 var bs=box.querySelectorAll("button");
 for(var i=0;i<bs.length;i++)bs[i].classList.toggle("on",bs[i].dataset.v===v)}

function loadIdx(){
  Promise.race([fetchJSONgz(IDX_URL),new Promise(function(_,rej){setTimeout(function(){rej(new Error("index timeout"))},25000)})])
    .then(function(idx){IDX=idx;buildAZ();applyFilters()})
    .catch(function(e){$("results").innerHTML='<div class="loading">Could not load the catalog index. Check your connection and reload.<br><br><button class="btn" onclick="loadIdx()">Retry</button> <a class="btn ghost" href="issues.html">Browse the static directory</a></div>'});
}
function buildAZ(){
  var box=$("az");box.innerHTML="";
  var mk=function(lbl,val){var b=document.createElement("button");b.textContent=lbl;b.dataset.v=val;
    b.onclick=function(){box.querySelectorAll("button").forEach(function(x){x.classList.remove("on")});b.classList.add("on");applyFilters()};box.appendChild(b);return b};
  var all=mk("★","");all.classList.add("on");
  for(var c=65;c<=90;c++)mk(String.fromCharCode(c),String.fromCharCode(c));
  mk("0-9","#");
}
function azVal(){var b=$("az").querySelector("button.on");return b?b.dataset.v:""}
function titleKey(t){return String(t).replace(/^(The|A|An)\s+/i,"")}
function applyFilters(){
  var q=$("q").value.trim().toLowerCase(), s=$("series").value,
      so=$("sort").value, az=azVal();
  syncPills();updateSearchExtras();
  FILTERED=IDX.filter(function(b){
    if(s&&b.s!==s)return false;
    if(az){var k=titleKey(b.t).charAt(0).toUpperCase();if(az==="#"){if(!/[0-9]/.test(k))return false}else if(k!==az)return false}
    if(q){
      var qn=q.replace(/^#/,""),numMatch=false;
      if(/^\d{1,6}$/.test(qn))numMatch=(b.n===parseInt(qn,10));
      var hay=(b.t+" "+b.s+" "+b.id+" #"+b.n+" "+(b.d||"")+" "+(b.c||[]).join(" ")).toLowerCase();
      if(hay.indexOf(q)<0&&!numMatch)return false;
    }
    return true});
  if(so==="title")FILTERED.sort(function(a,b){return titleKey(a.t).localeCompare(titleKey(b.t))});
  else if(so==="series")FILTERED.sort(function(a,b){return (a.sk<b.sk?-1:1)||(a.n-b.n)});
  else FILTERED.sort(function(a,b){return b.id<a.id?-1:1});
  SHOWN=0;render();
}
/* search distinguishes ISSUE vs HERO vs SERIES hits */
function updateSearchExtras(){
  var box=$("searchextras");if(!box)return;
  var q=$("q").value.trim().toLowerCase();
  if(q.length<2){box.innerHTML="";return}
  var out="";
  var sm=Object.keys(SNAME).filter(function(k){
    return SNAME[k].toLowerCase().indexOf(q)>=0||(SDESC[k]||"").toLowerCase().indexOf(q)>=0});
  if(sm.length)out+='<div class="exsect"><b>SERIES</b> '+sm.map(function(k){
    return '<button class="exbtn" data-series="'+esc(SNAME[k])+'">SERIES &middot; '+esc(SNAME[k])+'</button>'}).join("")+'</div>';
  var cs=(typeof mySeries==="function"?mySeries():[]).filter(function(s){
    return String(s.name).toLowerCase().indexOf(q)>=0});
  if(cs.length)out+='<div class="exsect"><b>YOUR SERIES</b> '+cs.map(function(s){
    return '<button class="exbtn" data-cseries="'+esc(s.name)+'">YOUR SERIES &middot; '+esc(s.name)+'</button>'}).join("")+'</div>';
  box.innerHTML=out;
  if(typeof loadHeroes!=="function")return;
  loadHeroes().then(function(hs){
    var cur=$("q").value.trim().toLowerCase();
    if(cur!==q)return; /* query moved on */
    var hm=hs.filter(function(h){
      return h.code.toLowerCase().indexOf(cur)>=0||h.name.toLowerCase().indexOf(cur)>=0}).slice(0,6);
    var mine=(typeof myHeroes==="function"?myHeroes():[]).filter(function(h){
      return h.code.toLowerCase().indexOf(cur)>=0}).slice(0,4);
    var hh="";
    if(hm.length)hh+='<div class="exsect"><b>HEROES</b> '+hm.map(function(h){
      return '<button class="exbtn" data-hero="'+esc(h.id)+'">HERO &middot; '+esc(h.code)+'</button>'}).join("")+'</div>';
    if(mine.length)hh+='<div class="exsect"><b>YOUR HEROES</b> '+mine.map(function(h){
      return '<button class="exbtn" data-hero="'+esc(h.id)+'">YOUR HERO &middot; '+esc(h.code)+'</button>'}).join("")+'</div>';
    box.innerHTML=out+hh;
    box.querySelectorAll("[data-hero]").forEach(function(b){
      b.onclick=function(){location.href="index.html#hero="+b.dataset.hero}});
    box.querySelectorAll("[data-series]").forEach(function(b){
      b.onclick=function(){$("series").value=b.dataset.series;applyFilters()}});
    box.querySelectorAll("[data-cseries]").forEach(function(b){
      b.onclick=function(){location.href="index.html#creator"}});
  }).catch(function(){});
}
function render(){
  var box=$("results");
  $("matchline").textContent=FILTERED.length.toLocaleString()+" of "+IDX.length.toLocaleString()+" issues match";
  if(!FILTERED.length){box.innerHTML='<div class="loading">No issues match. Try another search.</div>';return}
  var slice=FILTERED.slice(0,SHOWN+PAGE);
  var html='<p style="color:var(--mut)">'+FILTERED.length.toLocaleString()+' issues · showing '+slice.length+'</p><div class="grid">'+
    slice.map(function(b){
      return '<div class="card" data-id="'+b.id+'"><div class="cover">'+coverSVG(b)+'</div><div class="meta"><div class="t">'+esc(b.t)+
       '</div><div class="s">'+esc(b.s)+" #"+b.n+'</div><div class="n">'+esc(b.id)+' · '+(b.c||[]).slice(0,2).join(", ")+'</div><div style="margin-top:4px"><span class="stbadge">SIGNATURE ORIGINAL</span></div></div></div>'}).join("")+"</div>";
  if(slice.length<FILTERED.length)html+='<button class="btn more" id="morebtn">Show more</button>';
  box.innerHTML=html;
  box.querySelectorAll("[data-id]").forEach(function(el){el.onclick=function(){location.href="index.html#issue="+el.dataset.id}});
  var mb=$("morebtn");if(mb)mb.onclick=function(){SHOWN+=PAGE;render();window.scrollTo(0,document.body.scrollHeight)};
}

var FSTOP=new Set("the,a,an,and,or,for,to,of,in,on,with,is,it,this,that,what,does,which,how,are,be,was,were,at,by,from,as,so,but,if,not,no,yes,up,out,about,into,over,after,than,then,there,their,them,they,me,my,i,you,your,we,our,do,does,want,need,needs,looking,look,find,finds,get,something,anything,some,any,please,like,just,really,very,would,could,should,can,will,have,has,show,tell,give,kind,thing,things,describe,comic,issue,issues,series".split(","));
function fKeywords(t){return String(t||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(function(w){return w.length>=3&&!FSTOP.has(w)})}
function fScore(b,kws){var hay=(b.t+" "+b.s+" "+b.id+" "+(b.c||[]).join(" ")).toLowerCase();var s=0;
 kws.forEach(function(k){if(b.id.toLowerCase()===k)s+=10;else if(b.id.toLowerCase().indexOf(k)>=0)s+=6;
  if(hay.indexOf(k)>=0)s+=k.length>5?3:2});return s}
function fAsk(){
 var q=$("fq").value.trim();if(!q)return;
 var kws=fKeywords(q),box=$("fresults");
 if(!kws.length){box.innerHTML='<div class="fmsg">Give me one more word to go on — a hero, a series, a mood… 🔎</div>';return}
 if(!IDX.length){box.innerHTML='<div class="fmsg">The catalog index is still loading — give it a moment, then hit Find it. 🔎</div>';return}
 var hits=IDX.map(function(b){return{b:b,s:fScore(b,kws)}}).filter(function(x){return x.s>0})
  .sort(function(a,b){return b.s-a.s||(b.b.id<a.b.id?-1:1)}).slice(0,5);
 if(!hits.length){box.innerHTML='<div class="fmsg">No issues match "<b>'+esc(kws.join(" "))+'</b>" — try different words. 🔎</div>';return}
 box.innerHTML=hits.map(function(h){var b=h.b;
  return '<div class="fcard"><b>'+esc(b.t)+'</b><div class="fs">'+esc(b.s)+' #'+b.n+' · '+esc(b.id)+'</div><a class="btn" href="index.html#issue='+b.id+'">Take me there →</a></div>'}).join("");
}
function loadSeriesBand(){
  fetch(API_URL).then(function(r){if(!r.ok)throw new Error("http "+r.status);return r.json()}).then(function(api){
    var ss=$("series");Object.keys(api.series||{}).sort().forEach(function(s){
      var o=document.createElement("option");o.value=s;o.textContent=s+" ("+(api.series[s]).toLocaleString()+")";ss.appendChild(o)});
    var band=$("seriesband");
    band.innerHTML=Object.keys(api.series||{}).sort().map(function(s){
      var k=Object.keys(SNAME).filter(function(k){return SNAME[k]===s})[0]||"signal";
      var pal=PALS[k]||PALS.signal;
      return '<div class="scard" data-s="'+esc(s)+'"><h3 style="color:'+pal.acc+'">'+esc(s)+
       '</h3><p>'+esc(SDESC[k]||"")+'</p><div class="cnt">'+(api.series[s]).toLocaleString()+' issues</div></div>'}).join("");
    band.querySelectorAll(".scard").forEach(function(el){el.onclick=function(){$("series").value=el.dataset.s;applyFilters();var c=$("storebrowser");if(c)c.scrollIntoView()}});
    buildSeriesPills(Object.keys(api.series||{}).sort());
  }).catch(function(){
    var band=$("seriesband");
    if(band&&!band.innerHTML)band.innerHTML='<div class="loading">Series shelves could not load. <button class="btn ghost" onclick="loadSeriesBand()">Retry</button></div>';
  });
}

/* boot: wire the moved browser */
(function(){
  if(!$("storebrowser"))return;
  loadSeriesBand();
  loadIdx();
  $("q").addEventListener("input",function(){applyFilters()});
  ["series","sort"].forEach(function(id){$(id).addEventListener("change",applyFilters)});
  $("fgo").onclick=fAsk;
  $("fq").addEventListener("keydown",function(e){if(e.key==="Enter")fAsk()});
})();
