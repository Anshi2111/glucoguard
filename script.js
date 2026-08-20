const titles={
dashboard:["PATIENT OVERVIEW","Good morning, Demo Patient","Your glucose, meal, activity and insulin context in one place."],
glucose:["GLUCOSE MONITORING","Glucose monitoring","Demo CGM-style trend view."],
meal:["MEAL INTELLIGENCE","Meal Intelligence","Indian meal context and carbohydrate estimation."],
insulin:["INSULIN LOG","Insulin Log","Insulin history is used as context, not as a dosing recommendation."],
risk:["AI RISK ENGINE","AI Risk Engine","Context-aware short-term hypoglycemia risk insight."],
timeline:["HEALTH TIMELINE","Health Timeline","Glucose, meals, insulin, activity and AI insights in one view."],
safety:["SAFETY & PRIVACY","Safety & Privacy","Safety-first principles built into the prototype."]
};

function go(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  const target=document.getElementById(page);
  if(target) target.classList.add("active");
  document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  if(titles[page]){
    document.getElementById("eyebrow").textContent=titles[page][0];
    document.getElementById("page-title").textContent=titles[page][1];
    document.getElementById("page-subtitle").textContent=titles[page][2];
  }
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

let selected={name:"Poha + boiled egg",carbs:"30–40",confidence:"64"};
document.querySelectorAll(".food").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".food").forEach(x=>x.classList.remove("selected"));
    btn.classList.add("selected");
    selected={name:btn.dataset.food,carbs:btn.dataset.carbs,confidence:btn.dataset.confidence};
  });
});

function analyzeMeal(){
  document.getElementById("meal-result").innerHTML=`
    <div class="analysis">
      <div class="meal-info">
        <span class="label">MEAL IDENTIFIED</span>
        <h3>${selected.name}</h3>
        <p>Indian meal context • Breakfast/Lunch/Dinner classification represented in demo</p>
      </div>
      <div>
        <span class="label">ESTIMATED CARBOHYDRATE</span>
        <div class="carb-number">${selected.carbs} <small>g</small></div>
        <div style="font-size:8px;color:#738196;margin-top:5px">Confidence ${selected.confidence}% • Medium</div>
        <div class="confidence"><i style="width:${selected.confidence}%"></i></div>
      </div>
    </div>
    <div class="result-note">Portion size, ingredients and preparation can change the estimate. This prototype intentionally communicates uncertainty.</div>
  `;
  showToast("Meal analysis completed");
}

document.getElementById("scanBtn").addEventListener("click",analyzeMeal);

function saveInsulin(){
  const dose=document.getElementById("dose").value||"4";
  const history=document.getElementById("insulin-history");
  history.insertAdjacentHTML("afterbegin",`<div class="history-row"><span>💉 <b>Rapid-acting</b><small>Breakfast • just now</small></span><strong>${dose} units</strong></div>`);
  showToast("Insulin record saved as demo context");
}

function runRisk(){
  showToast("Risk engine recalculated using demo context");
}

function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;t.style.display="block";
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>t.style.display="none",2200);
}
