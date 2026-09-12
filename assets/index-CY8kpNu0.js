(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[`grain`,`ore`,`timber`,`fibre`],t=[`vale`,`ridge`,`cross`],n={grain:`Grain`,ore:`Ore`,timber:`Timber`,fibre:`Fibre`},r={vale:{id:`vale`,name:`Vale`,local:[`grain`,`fibre`],foreign:[`ore`,`timber`]},ridge:{id:`ridge`,name:`Ridge`,local:[`ore`,`timber`],foreign:[`grain`,`fibre`]},cross:{id:`cross`,name:`Cross`,local:[`grain`,`ore`],foreign:[`timber`,`fibre`]}},i={clickAmount:1,idlePerSecond:.2,energyCap:30,energyRegenSeconds:2,nodeUpgradeBase:10,nodeUpgradeGrowth:1.15},a={"vale-ridge":25,"ridge-vale":25,"vale-cross":20,"cross-vale":20,"ridge-cross":20,"cross-ridge":20},o={cargoCap:40,feeAmount:2},s={grain:20,ore:20},c={fairPrice:1,localBuyMult:.7,localSellMult:1.3,foreignBuyMult:1.05,foreignSellMult:1.15},l=`regional-trade-v1`;function u(e,t){return`${e}-${t}`}function d(e,t){return a[u(e,t)]??25}function f(e,t){let n=r[e],i=c.fairPrice;return n.local.includes(t)?i*c.localBuyMult:i*c.foreignBuyMult}function p(e,t){let n=r[e],i=c.fairPrice;return n.local.includes(t)?i*c.localSellMult:i*c.foreignSellMult}function m(){return{grain:0,ore:0,timber:0,fibre:0}}function h(e){return{...e}}function g(t){return e.reduce((e,n)=>e+t[n],0)}function _(){let e=Object.fromEntries(t.map(e=>[e,m()]));return{region:`vale`,warehouse:m(),stashes:e,coin:0,energy:i.energyCap,energyRegenAcc:0,nodes:{vale:{grain:1,fibre:1},ridge:{ore:1,timber:1},cross:{grain:1,ore:1}},travel:null,workbenchCrafted:!1,log:[`Spawn Vale. Leave 20 grain home. Fee 2 + carry ~28 grain → Ridge (25s), or hop Vale → Cross → Ridge (20s each). Sell grain (1.05), buy Ridge ore (local sell 1.3), return, craft.`]}}function v(e,t){e.log.unshift(t),e.log.length>8&&(e.log.length=8)}function y(e){return e.region?e.stashes[e.region]:null}function b(e,t){return!(!e.region||e.travel||!r[e.region].local.includes(t)||e.energy<1)}function ee(e,t){if(!b(e,t))return!1;let n=y(e);return n[t]+=i.clickAmount,--e.energy,!0}function x(e,t,n){return e.nodes[t][n]??0}function S(e,t){if(!e.region||e.travel||!r[e.region].local.includes(t))return null;let n=x(e,e.region,t);return i.nodeUpgradeBase*i.nodeUpgradeGrowth**+n}function te(e,t){let n=S(e,t);if(n===null||!e.region)return!1;let i=y(e);return i[t]<n?!1:(i[t]-=n,e.nodes[e.region][t]=(e.nodes[e.region][t]??0)+1,v(e,`Upgraded ${t} node in ${r[e.region].name} (lv ${e.nodes[e.region][t]}).`),!0)}function C(e,t){if(!e.region||e.travel)return;let n=r[e.region],a=e.stashes[e.region];for(let r of n.local){let n=x(e,e.region,r);n<=0||(a[r]+=i.idlePerSecond*n*t)}}function ne(e,t){if(e.energy>=i.energyCap){e.energyRegenAcc=0;return}for(e.energyRegenAcc+=t;e.energyRegenAcc>=i.energyRegenSeconds&&e.energy<i.energyCap;)e.energyRegenAcc-=i.energyRegenSeconds,e.energy+=1}function re(e,t){e.travel&&(e.travel.elapsed+=t,e.travel.elapsed>=e.travel.duration&&w(e))}function w(t){let n=t.travel,i=n.to,a=t.stashes[i];for(let t of e)a[t]+=n.cargo[t];t.region=i,t.travel=null,v(t,`Arrived in ${r[i].name}.`)}function T(e,t){ne(e,t);let n=!!e.travel,r=0;if(e.travel&&(r=Math.max(0,e.travel.duration-e.travel.elapsed)),re(e,t),n&&!e.travel){let n=Math.max(0,t-r);n>0&&C(e,n)}else C(e,t)}function E(t,n){if(t.travel)return`Already travelling.`;if(!t.region)return`Not in a region.`;if(n.to===t.region)return`Already there.`;if(!d(t.region,n.to))return`No route.`;let i=t.stashes[t.region],a=o.feeAmount;if(!r[t.region].local.includes(n.feeGood))return`Fee must be a local good.`;let s=h(n.cargo);s[n.feeGood]+=a;for(let t of e)if(i[t]+1e-9<s[t])return`Need ${s[t].toFixed(0)} ${t} (incl. fee).`;let c=g(n.cargo);return c>o.cargoCap?`Cargo over cap (${o.cargoCap}).`:c<0?`Invalid cargo.`:null}function ie(t,n){let i=E(t,n);if(i)return v(t,i),!1;let a=t.region,s=t.stashes[a],c=o.feeAmount;s[n.feeGood]-=c;for(let t of e)s[t]-=n.cargo[t];return t.travel={from:a,to:n.to,elapsed:0,duration:d(a,n.to),cargo:h(n.cargo),feeGood:n.feeGood,feeAmount:c},t.region=null,v(t,`Departing ${r[a].name} → ${r[n.to].name} (${t.travel.duration}s). Fee: ${c} ${n.feeGood}.`),!0}function ae(t){if(!t.travel)return!1;let n=t.travel,i=t.stashes[n.from];for(let t of e)i[t]+=n.cargo[t];return t.region=n.from,t.travel=null,v(t,`Cancelled travel. Fee lost. Cargo returned to ${r[n.from].name}.`),!0}function oe(e,t,n){if(!e.region||e.travel||n<=0)return!1;let r=e.stashes[e.region];if(r[t]<n)return!1;let i=f(e.region,t);return r[t]-=n,e.coin+=i*n,v(e,`Sold ${n} ${t} @ ${i.toFixed(2)} → +${(i*n).toFixed(2)} coin.`),!0}function se(e,t,n){if(!e.region||e.travel||n<=0)return!1;let r=p(e.region,t),i=r*n;if(e.coin+1e-9<i)return v(e,`Need ${i.toFixed(2)} coin to buy ${n} ${t} (have ${e.coin.toFixed(2)}).`),!1;let a=e.stashes[e.region];return e.coin-=i,a[t]+=n,v(e,`Bought ${n} ${t} @ ${r.toFixed(2)} → −${i.toFixed(2)} coin.`),!0}function D(e){if(e.workbenchCrafted)return`Already crafted.`;if(!e.region||e.travel)return`Must be in a region.`;let t=e.stashes[e.region];for(let[e,n]of Object.entries(s))if(t[e]<n)return`Need ${n} ${e} here (have ${t[e].toFixed(1)}).`;return null}function ce(e){let t=D(e);if(t)return v(e,t),!1;let n=y(e);for(let[e,t]of Object.entries(s))n[e]-=t;return e.workbenchCrafted=!0,v(e,`Crafted Workbench! Loop complete.`),!0}function le(t){return typeof t==`string`&&e.includes(t)}function O(e){return typeof e==`string`&&t.includes(e)}function k(e){return typeof e==`number`&&Number.isFinite(e)&&e>=0}function A(t){if(!t||typeof t!=`object`)return null;let n=t,r=m();for(let t of e){let e=n[t];if(!k(e))return null;r[t]=e}return r}function j(e){if(e===null)return null;if(!e||typeof e!=`object`)return;let t=e;if(!O(t.from)||!O(t.to)||t.from===t.to||!k(t.elapsed)||!k(t.duration)||t.duration<=0)return;let n=A(t.cargo);if(n&&le(t.feeGood)&&k(t.feeAmount))return{from:t.from,to:t.to,elapsed:t.elapsed,duration:t.duration,cargo:n,feeGood:t.feeGood,feeAmount:t.feeAmount}}function ue(e){if(!e||typeof e!=`object`)return null;let n=e,i=_().nodes;for(let e of t){let t=n[e];if(!t||typeof t!=`object`)return null;let a=t,o={};for(let t of r[e].local){let e=a[t];if(typeof e!=`number`||!Number.isFinite(e)||e<1)return null;o[t]=e}i[e]=o}return i}function de(e){if(typeof localStorage>`u`)return;let t={version:1,savedAt:Date.now(),region:e.region,stashes:{vale:h(e.stashes.vale),ridge:h(e.stashes.ridge),cross:h(e.stashes.cross)},coin:e.coin,energy:e.energy,energyRegenAcc:e.energyRegenAcc,nodes:e.nodes,travel:e.travel?{...e.travel,cargo:h(e.travel.cargo)}:null,workbenchCrafted:e.workbenchCrafted,log:e.log.slice(0,8)};try{localStorage.setItem(l,JSON.stringify(t))}catch{}}function fe(){try{localStorage.removeItem(l)}catch{}}function pe(){if(typeof localStorage>`u`)return null;let e;try{e=localStorage.getItem(l)}catch{return null}if(!e)return null;try{let n=JSON.parse(e);if(n.version!==1||typeof n.savedAt!=`number`||!Number.isFinite(n.savedAt))return null;let r={};if(!n.stashes||typeof n.stashes!=`object`)return null;for(let e of t){let t=A(n.stashes[e]);if(!t)return null;r[e]=t}if(!k(n.coin)||typeof n.energy!=`number`||!Number.isFinite(n.energy)||!k(n.energyRegenAcc))return null;let a=Math.min(i.energyCap,Math.max(0,Math.floor(n.energy))),o=ue(n.nodes);if(!o)return null;let s=j(n.travel);if(s===void 0)return null;let c;if(s)c=null;else if(O(n.region))c=n.region;else return null;if(typeof n.workbenchCrafted!=`boolean`)return null;let l=Array.isArray(n.log)?n.log.filter(e=>typeof e==`string`).slice(0,8):[],u=_();return{...u,region:c,stashes:r,coin:n.coin,energy:a,energyRegenAcc:n.energyRegenAcc,nodes:o,travel:s,workbenchCrafted:n.workbenchCrafted,log:l.length?l:u.log}}catch{return null}}function me(){return fe(),_()}var M=pe()??_(),N={grain:0,ore:0,timber:0,fibre:0},P=`grain`,F=1,I=`ridge`,L=!0,R=0,z=document.querySelector(`#app`);function B(e){return Math.abs(e-Math.round(e))<1e-6?String(Math.round(e)):e.toFixed(1)}var he={grain:`🌾`,ore:`🪨`,timber:`🪵`,fibre:`🧶`};function V(e){return`<span class="ico ${e}" title="${n[e]}" aria-hidden="true">${he[e]}</span>`}function H(e){return`<span class="gchip">${V(e)}<span>${n[e]}</span></span>`}function U(){if(M.travel){let e=Math.max(0,M.travel.duration-M.travel.elapsed);return`${r[M.travel.from].name} → ${r[M.travel.to].name} · ${e.toFixed(1)}s`}return M.region?r[M.region].name:`—`}function W(){de(M)}function G(){z.querySelectorAll(`[data-cargo]`).forEach(e=>{let t=e.dataset.cargo;N[t]=Math.max(0,Number(e.value)||0)});let e=z.querySelector(`#feeGood`);e&&(P=e.value);let t=z.querySelector(`#tradeAmt`);t&&(F=Math.max(1,Math.floor(Number(t.value)||1)));let n=z.querySelector(`#dest`);n&&(I=n.value)}function K(){return e.reduce((e,t)=>e+N[t],0)}function ge(t){if(!M.region||M.travel)return;let n=M.stashes[M.region],r=t===P?o.feeAmount:0,i=e.reduce((e,n)=>e+(n===t?0:N[n]),0),a=Math.max(0,o.cargoCap-i),s=Math.max(0,n[t]-r);N[t]=Math.floor(Math.min(a,s))}function q(e){let n=t.filter(t=>t!==M.region&&M.stashes[t][e]>.05).map(t=>`${B(M.stashes[t][e])} in ${r[t].name}`);return n.length?n.join(`, `):``}function _e(){if(M.workbenchCrafted)return`<div class="win">Workbench crafted</div>`;let e=M.region?M.stashes[M.region]:null;return`<div class="goal"><span class="lbl">Workbench</span> ${Object.entries(s).map(([t,n])=>{let r=e?e[t]:0,i=r+1e-9>=n,a=q(t);return`<span class="need ${i?`ok`:``}" data-goal="${t}">${V(t)} <span data-goal-have="${t}">${B(r)}</span>/${n}${!i&&a?` <em data-goal-else="${t}">(${a})</em>`:`<em data-goal-else="${t}" hidden></em>`}</span>`}).join(``)}</div>`}function ve(t){let i=r[t],a=M.region===t&&!M.travel;return`
    <article class="stash ${a?`here`:``} ${t}">
      <header>
        <strong>${i.name}</strong>
        <span class="tag">${a?`You are here`:i.local.map(e=>n[e]).join(` · `)}</span>
      </header>
      <ul>
        ${e.map(e=>`<li class="${i.local.includes(e)?`local`:`foreign`}">
            ${H(e)}
            <strong data-stash="${t}" data-inv="${e}">${B(M.stashes[t][e])}</strong>
          </li>`).join(``)}
      </ul>
    </article>`}function J(){let a=!!M.region&&!M.travel,s=M.region?r[M.region]:null,c=M.region?M.stashes[M.region]:null;s&&!s.local.includes(P)&&(P=s.local[0]),s&&I===s.id&&(I=t.find(e=>e!==s.id)??`ridge`);let l=D(M),u=t.filter(e=>e!==M.region),m=s?d(s.id,I):0,h=Math.min(100,M.energy/i.energyCap*100),g=M.travel?Math.min(100,M.travel.elapsed/M.travel.duration*100):0;z.innerHTML=`
    <div class="wrap">
      <header class="top">
        <div>
          <h1>Regional Trade</h1>
          <p class="sub">Solo v1 — harvest local → travel → NPC trade → craft Workbench</p>
        </div>
        <button type="button" class="ghost" data-act="reset">Reset save</button>
      </header>

      <section class="status-bar">
        <div class="where ${M.travel?`transit`:M.region??``}">
          <span class="lbl">${M.travel?`In transit`:`Region`}</span>
          <strong id="ui-region">${U()}</strong>
          ${M.travel?`<div class="bar"><div class="fill" id="ui-bar" style="width:${g}%"></div></div>`:``}
        </div>
        <div class="stat">
          <span class="lbl">Energy</span>
          <strong><span id="ui-energy">${M.energy}</span> / ${i.energyCap}</strong>
          <div class="bar energy"><div class="fill" id="ui-energy-bar" style="width:${h}%"></div></div>
        </div>
        <div class="stat">
          <span class="lbl">Coin</span>
          <strong id="ui-coin">${B(M.coin)}</strong>
        </div>
        ${_e()}
      </section>

      ${M.travel?`
        <section class="panel travel-live">
          <h2>Travel</h2>
          <p>Not in a region. Idle harvest paused. Cargo does not sit in a stash until you arrive.</p>
          <p class="cargo-line">Cargo ${B(e.reduce((e,t)=>e+M.travel.cargo[t],0))} / ${o.cargoCap}
            ${e.filter(e=>M.travel.cargo[e]>0).map(e=>`${H(e)} ${B(M.travel.cargo[e])}`).join(` `)}
          </p>
          <button type="button" class="sec" data-act="cancel">Cancel (lose fee, cargo returns to ${r[M.travel.from].name})</button>
        </section>`:``}

      <section class="stashes" aria-label="Stashes by region">
        ${t.map(ve).join(``)}
      </section>

      <div class="layout">
        ${a&&s&&c?`
          <section class="panel harvest">
            <h2>Harvest <span class="muted">local only</span></h2>
            <p class="hint">Click +${i.clickAmount} · idle +${i.idlePerSecond}/s × node · pauses in transit. Energy regen 1 / ${i.energyRegenSeconds}s.</p>
            <div class="row">
              ${s.local.map(e=>{let t=x(M,s.id,e),r=S(M,e);return`
                  <div class="card">
                    <button type="button" data-act="harvest" data-good="${e}" ${b(M,e)?``:`disabled`}>
                      ${V(e)} Harvest ${n[e]}
                    </button>
                    <div class="meta">Node lv ${t} · idle ${B(i.idlePerSecond*t)}/s</div>
                    <button type="button" class="sec" data-act="upgrade" data-good="${e}" ${r!==null&&c[e]>=r?``:`disabled`}>
                      Upgrade (${r===null?`—`:B(r)} ${n[e]})
                    </button>
                  </div>`}).join(``)}
            </div>
            <p class="hint foreign-note">${s.name} cannot harvest ${s.foreign.map(e=>n[e]).join(` or `)}.</p>
          </section>

          <section class="panel npc">
            <h2>NPC market <span class="muted">${s.name}</span></h2>
            <p class="hint">Not 1:1. Local buy 0.7P / sell 1.3P. Foreign buy 1.05P / sell 1.15P. P=1. Ridge ore sells at <strong>1.3</strong>.</p>
            <div class="trade-amt">
              Amount
              <input type="number" id="tradeAmt" min="1" step="1" value="${F}" />
            </div>
            <table>
              <thead><tr><th>Good</th><th>You sell</th><th>You buy</th><th></th></tr></thead>
              <tbody>
                ${e.map(e=>{let t=f(s.id,e),n=p(s.id,e);return`<tr class="${s.local.includes(e)?`local`:`foreign`}">
                    <td>${H(e)}</td>
                    <td>${t.toFixed(2)}</td>
                    <td>${n.toFixed(2)}</td>
                    <td class="acts">
                      <button type="button" data-act="sell" data-good="${e}">Sell</button>
                      <button type="button" data-act="buy" data-good="${e}">Buy</button>
                    </td>
                  </tr>`}).join(``)}
              </tbody>
            </table>
          </section>

          <section class="panel depart">
            <h2>Travel</h2>
            <p class="hint">Fee ${o.feeAmount} of a <em>local</em> good. Cargo cap ${o.cargoCap}. Idle pauses. Direct Vale↔Ridge ${d(`vale`,`ridge`)}s. Two-hop Vale→Cross→Ridge ${d(`vale`,`cross`)}s + ${d(`cross`,`ridge`)}s (no new buildings).</p>
            <div class="routes" aria-label="Routes">
              <span>Vale ↔ Ridge ${d(`vale`,`ridge`)}s</span>
              <span>Vale ↔ Cross ${d(`vale`,`cross`)}s</span>
              <span>Cross ↔ Ridge ${d(`cross`,`ridge`)}s</span>
            </div>
            <div class="row cargo">
              ${e.map(e=>`
                <label>${H(e)}
                  <span class="pack">
                    <input type="number" min="0" step="1" data-cargo="${e}" value="${N[e]}" />
                    <button type="button" class="tiny" data-act="pack" data-good="${e}">max</button>
                  </span>
                </label>`).join(``)}
            </div>
            <div class="row">
              <label>Fee
                <select id="feeGood">
                  ${s.local.map(e=>`<option value="${e}" ${e===P?`selected`:``}>${n[e]}</option>`).join(``)}
                </select>
              </label>
              <label>Destination
                <select id="dest">
                  ${u.map(e=>`<option value="${e}" ${e===I?`selected`:``}>${r[e].name} (${d(s.id,e)}s)</option>`).join(``)}
                </select>
              </label>
              <button type="button" data-act="depart">Depart (${m}s)</button>
            </div>
            <p class="meta" id="ui-cargo-total">Cargo ${B(K())} / ${o.cargoCap}${I===`cross`&&s.id===`vale`?` · Two-hop: after Cross, depart Ridge for the ore market (local sell 1.3P).`:I===`ridge`&&s.id===`vale`?` · Leave 20 grain in Vale for the craft.`:``}</p>
          </section>

          <section class="panel craft">
            <h2>Craft</h2>
            <p class="hint">Goods must be in <em>this</em> stash. Vale has no ore node — finish the Ridge (or Cross→Ridge) trip.</p>
            <button type="button" data-act="craft" ${l?`disabled`:``}>
              Craft Workbench (20 grain + 20 ore)
            </button>
            ${M.workbenchCrafted?``:`<p class="hint" id="ui-craft-err">${l??``}</p>`}
            ${M.workbenchCrafted?`<p class="win">Loop complete.</p>`:``}
          </section>
        `:`
          <section class="panel harvest muted-panel">
            <h2>Harvest</h2>
            <p class="hint">Paused in transit. No clicks, no idle.</p>
          </section>
          <section class="panel npc muted-panel">
            <h2>NPC market</h2>
            <p class="hint">You trade only while standing in a region.</p>
          </section>
        `}
      </div>

      <section class="panel log">
        <h2>Log</h2>
        <ul id="ui-log">${M.log.map(e=>`<li>${e}</li>`).join(``)}</ul>
      </section>
    </div>
  `,L=!1}function Y(){let n=document.getElementById(`ui-region`);n&&(n.textContent=U());let r=document.getElementById(`ui-energy`);r&&(r.textContent=String(M.energy));let a=document.getElementById(`ui-energy-bar`);a&&(a.style.width=`${Math.min(100,M.energy/i.energyCap*100)}%`);let o=document.getElementById(`ui-coin`);o&&(o.textContent=B(M.coin));for(let n of t){let t=M.stashes[n];for(let r of e){let e=document.querySelector(`[data-stash="${n}"][data-inv="${r}"]`);e&&(e.textContent=B(t[r]))}}if(M.travel){let e=document.getElementById(`ui-bar`);e&&(e.style.width=`${Math.min(100,M.travel.elapsed/M.travel.duration*100)}%`)}z.querySelectorAll(`button[data-act="harvest"]`).forEach(e=>{let t=e.dataset.good;e.disabled=!b(M,t)}),z.querySelectorAll(`button[data-act="upgrade"]`).forEach(e=>{let t=e.dataset.good,n=S(M,t),r=M.region?M.stashes[M.region]:null;e.disabled=n===null||!r||r[t]<n});let c=M.region&&!M.travel?M.stashes[M.region]:null;for(let[e,t]of Object.entries(s)){let n=c?c[e]:0,r=document.querySelector(`[data-goal-have="${e}"]`);r&&(r.textContent=B(n));let i=document.querySelector(`[data-goal="${e}"]`);i&&i.classList.toggle(`ok`,n+1e-9>=t);let a=document.querySelector(`[data-goal-else="${e}"]`);if(a){let r=q(e);r&&n+1e-9<t?(a.hidden=!1,a.textContent=`(${r})`):(a.hidden=!0,a.textContent=``)}}let l=z.querySelector(`button[data-act="craft"]`),u=D(M);l&&(l.disabled=!!u);let d=document.getElementById(`ui-craft-err`);d&&!M.workbenchCrafted&&(d.textContent=u??``)}function ye(e){if(W(),e)L=!0,J();else{Y();let e=document.getElementById(`ui-log`);e&&(e.innerHTML=M.log.map(e=>`<li>${e}</li>`).join(``))}}z.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-act]`);if(!n)return;let r=n.dataset.act,i=n.dataset.good;if(G(),r===`reset`){if(!confirm(`Reset stash, nodes, coin, energy, and region? This clears localStorage.`))return;M=me(),e.forEach(e=>N[e]=0),I=`ridge`,P=`grain`,L=!0,J();return}let a=!!M.travel,s=M.region;if(r===`harvest`&&i&&ee(M,i),r===`upgrade`&&i&&te(M,i),r===`sell`&&i&&oe(M,i,F),r===`buy`&&i&&se(M,i,F),r===`cancel`&&ae(M),r===`craft`&&ce(M),r===`pack`&&i){ge(i);let e=z.querySelector(`[data-cargo="${i}"]`);e&&(e.value=String(N[i]));let t=document.getElementById(`ui-cargo-total`);t&&(t.textContent=`Cargo ${B(K())} / ${o.cargoCap}`);return}if(r===`depart`){let t={...N},n=E(M,{to:I,cargo:t,feeGood:P});n?(M.log.unshift(n),M.log.length>8&&(M.log.length=8)):(ie(M,{to:I,cargo:t,feeGood:P}),e.forEach(e=>N[e]=0))}ye(!!M.travel!==a||M.region!==s||r===`craft`||r===`upgrade`||r===`sell`||r===`buy`||r===`depart`||r===`cancel`)}),z.addEventListener(`input`,()=>{G();let e=document.getElementById(`ui-cargo-total`);e&&(e.textContent=`Cargo ${B(K())} / ${o.cargoCap}`)}),window.addEventListener(`beforeunload`,W),document.addEventListener(`visibilitychange`,()=>{document.visibilityState===`hidden`&&W()});var X=performance.now(),Z=0,Q=1/10;function $(e){let t=(e-X)/1e3;X=e,t>1&&(t=1),Z+=t,R+=t;let n=!1;for(;Z>=Q;){let e=!!M.travel;T(M,Q),e&&!M.travel&&(n=!0),Z-=Q}R>=1&&(W(),R=0),n||L?(L=!0,J()):Y(),requestAnimationFrame($)}J(),requestAnimationFrame($);