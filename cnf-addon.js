// Canadian Nutrient File add-on - enhances nutrient search with 5,690 foods
(function(){
  var CNF_FOODS = null;
  var CNF_CACHE = {};
  var CNF_MAP = {208:'cal',203:'protein',204:'fat',205:'carbs',291:'fiber',269:'sugar',301:'calcium',303:'iron',304:'magnesium',305:'phosphorus',306:'potassium',307:'sodium',309:'zinc',317:'selenium',320:'vita',401:'vitc',328:'vitd',323:'vite',430:'vitk',415:'vitb6',418:'vitb12',435:'folate',404:'thiamine',405:'riboflavin',406:'niacin',601:'cholesterol',606:'satfat'};
  var KW = {protein:['chicken','beef','pork','fish','salmon','tuna','egg','cheese','yogurt','tofu','lentil','bean','shrimp'],fiber:['bean','lentil','oat','bran','flax','chia','raspberry','broccoli','avocado','quinoa'],calcium:['milk','cheese','yogurt','sardine','tofu','kale','almond'],iron:['liver','beef','spinach','lentil','clam','oyster','quinoa','tofu'],vitc:['orange','strawberry','kiwi','pepper','broccoli','kale','guava','tomato'],vitd:['salmon','mackerel','sardine','tuna','egg','mushroom'],potassium:['banana','potato','spinach','yogurt','salmon','avocado','bean','lentil']};

  async function loadFoods(){
    if(CNF_FOODS) return CNF_FOODS;
    try {
      var c = localStorage.getItem('gn_cnf_foods');
      var t = localStorage.getItem('gn_cnf_foods_t');
      if(c && t && Date.now()-parseInt(t) < 86400000){
        CNF_FOODS = JSON.parse(c); return CNF_FOODS;
      }
    } catch(e){}
    try {
      var r = await fetch('/.netlify/functions/cnf?endpoint=food');
      var d = await r.json();
      if(Array.isArray(d)){
        CNF_FOODS = d;
        try { localStorage.setItem('gn_cnf_foods', JSON.stringify(d)); localStorage.setItem('gn_cnf_foods_t', Date.now()); } catch(e){}
        return d;
      }
    } catch(e){ console.log('CNF load failed', e); }
    return [];
  }

  async function getNutrients(code){
    if(CNF_CACHE[code]) return CNF_CACHE[code];
    try {
      var r = await fetch('/.netlify/functions/cnf?endpoint=nutrientamount&id='+code);
      var d = await r.json();
      if(Array.isArray(d)){
        var n = {cal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,sodium:0,potassium:0,vitc:0,iron:0,calcium:0,vitd:0,serving:100};
        d.forEach(function(x){
          var k = CNF_MAP[x.nutrient_name_id];
          if(k) n[k] = parseFloat(x.nutrient_value)||0;
        });
        CNF_CACHE[code] = n; return n;
      }
    } catch(e){ console.log('CNF nutrients failed', e); }
    return null;
  }

  async function appendCNF(){
    if(typeof selectedNutrient==='undefined' || typeof NUTRIENTS==='undefined') return;
    var el = document.getElementById('nutrient-results');
    if(!el) return;
    var nutrient = NUTRIENTS.find(function(n){return n.key===selectedNutrient;});
    if(!nutrient) return;
    
    // Add loading indicator
    if(!document.getElementById('cnf-loading')){
      el.insertAdjacentHTML('beforeend','<div id="cnf-loading" style="padding:14px 16px;text-align:center;color:var(--muted);font-size:12px;"><span style="display:inline-block;">Loading more from Canadian Nutrient File...</span></div>');
    }
    
    var foods = await loadFoods();
    if(!foods.length){ var l = document.getElementById('cnf-loading'); if(l) l.remove(); return; }
    
    var kws = KW[nutrient.key] || [];
    var candidates = kws.length 
      ? foods.filter(function(f){ var d=(f.food_description||'').toLowerCase(); return kws.some(function(k){return d.indexOf(k)>=0;}); }).slice(0,20)
      : foods.slice(0,20);
    
    var scored = [];
    for(var i=0; i<candidates.length; i++){
      var f = candidates[i];
      var n = await getNutrients(f.food_code);
      if(!n) continue;
      var val = n[nutrient.key] || 0;
      var score = viewMode==='percal' ? val/((n.cal||1)/100) : val;
      if(score > 0) scored.push({f:f, n:n, score:score});
    }
    scored.sort(function(a,b){return b.score-a.score;});
    var top = scored.slice(0,10);
    
    var loading = document.getElementById('cnf-loading');
    if(!top.length){ if(loading) loading.remove(); return; }
    
    var maxScore = top[0].score;
    var html = '<div style="padding:14px 16px 4px;font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid var(--border);margin-top:8px;">From Canadian Nutrient File</div>';
    html += top.map(function(s, i){
      var safeName = (s.f.food_description||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      var pct = (s.score/maxScore)*100;
      return '<div class="food-card"><div class="food-card-top"><div style="flex:1;"><div style="font-size:10px;color:'+nutrient.color+';font-weight:700;margin-bottom:2px;">#'+(i+1)+' '+nutrient.label+' \u00b7 CNF</div><div class="food-card-name">'+safeName+'</div></div><div style="text-align:right;"><div class="food-card-val" style="color:'+nutrient.color+'">'+s.score.toFixed(1)+'</div><div class="food-card-unit">'+(viewMode==='percal'?'per 100 kcal':'per 100g')+'</div></div></div><div class="food-card-bar"><div class="food-card-fill" style="width:'+pct+'%;background:'+nutrient.color+'"></div></div><div class="food-card-macros"><span class="fmacro">\u26a1 '+Math.round(s.n.cal||0)+' kcal</span><span class="fmacro" style="color:var(--protein)">P '+(s.n.protein||0).toFixed(0)+'g</span><span class="fmacro" style="color:var(--carbs)">C '+(s.n.carbs||0).toFixed(0)+'g</span><span class="fmacro" style="color:var(--fat)">F '+(s.n.fat||0).toFixed(0)+'g</span><span class="verified-badge">CNF</span></div><button class="food-card-add" data-code="'+s.f.food_code+'" data-name="'+safeName+'" onclick="window._addCNF(this)">\uff0b Add to Today</button></div>';
    }).join('');
    
    if(loading) loading.outerHTML = html;
  }

  window._addCNF = async function(btn){
    var code = parseInt(btn.dataset.code);
    var name = btn.dataset.name;
    if(typeof showToast==='function') showToast('Loading...');
    var n = await getNutrients(code);
    if(!n) return;
    var food = Object.assign({name:name, verified:true}, n);
    if(typeof showMealPicker==='function'){
      showMealPicker(name, function(meal){
        var log = loadDayLog(dayOffset);
        log.foods.push(Object.assign({}, food, {meal:meal, id:Date.now()}));
        saveDayLog(log, dayOffset);
        if(typeof renderNutrition==='function') renderNutrition();
        if(typeof showToast==='function') showToast('\u2713 '+name+' added to '+meal);
      });
    }
  };

  // Hook into existing renderNutrientResults
  function hook(){
    if(typeof renderNutrientResults !== 'function'){ setTimeout(hook, 200); return; }
    var orig = window.renderNutrientResults;
    window.renderNutrientResults = function(){
      var r = orig.apply(this, arguments);
      setTimeout(appendCNF, 100);
      return r;
    };
    console.log('[CNF] Addon loaded');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', hook);
  else hook();
})();