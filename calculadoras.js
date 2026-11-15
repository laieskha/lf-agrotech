/* LF AgroTech — Central de Cálculos Agronômicos.
   Cálculos matemáticos transparentes. Sem prescrição automática de defensivos,
   adubação ou corretivos. As metas são informadas pelo usuário / técnico. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const fmt = (n, decimals=2) => n.toLocaleString('pt-BR',{maximumFractionDigits:decimals});
  const fmt2 = (n) => n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt0 = (n) => n.toLocaleString('pt-BR',{maximumFractionDigits:0});
  const num = (v) => {
    const s = String(v??'').trim().replace(/\s/g,'');
    if (!s) return NaN;
    // Milhar brasileiro (1.000.000 ou 70.000) e decimal com vírgula.
    if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) return Number(s.replace(/\./g,'').replace(',','.'));
    // Números decimais sem agrupamento (7,5 ou 0.50).
    if (/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(s)) return Number(s.replace(',','.'));
    return NaN;
  };
  const requiredNumber = (id,{min=0,max=1e12,positive=false,label=id}={}) => {
    const field=document.getElementById(id), value=num(field?.value);
    if(!Number.isFinite(value) || value<min || (positive && value<=0) || value>max) {
      if(field) {field.setAttribute('aria-invalid','true'); field.focus();}
      throw Error(`Confira “${label}”. Informe um número ${positive?'maior que zero':'válido'}${Number.isFinite(max)&&max<1e12?' até '+fmt(max):''}.`);
    }
    return value;
  };
  const optionallyNumber=(id)=> {const v=$("#"+id)?.value?.trim();return v ? num(v) : NaN;};
  const field=(id,label,unit='',val='',hint='')=>`<div class="calc-field"><label for="${id}">${label}</label><div class="field-wrap dynamic-wrap"><input id="${id}" type="text" inputmode="decimal" value="${val}" placeholder="Informe um valor" autocomplete="off">${unit?`<span class="field-unit">${unit}</span>`:''}</div>${hint?`<small>${hint}</small>`:''}</div>`;
  const fieldSelect=(id,label,values,hint='')=>`<div class="calc-field"><label for="${id}">${label}</label><select id="${id}">${values.map(v=>`<option value="${v[0]}">${v[1]}</option>`).join('')}</select>${hint?`<small>${hint}</small>`:''}</div>`;
  const UF = [['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
  const PRODUCTS = {
    ureia:{name:'Ureia (45% N; exemplo)',n:45,p:0,k:0,kind:'mineral'},
    sulfato:{name:'Sulfato de amônio (20% N; exemplo)',n:20,p:0,k:0,kind:'mineral'},
    sfs:{name:'Superfosfato simples (18% P₂O₅; exemplo)',n:0,p:18,k:0,kind:'mineral'},
    sft:{name:'Superfosfato triplo (41% P₂O₅; exemplo)',n:0,p:41,k:0,kind:'mineral'},
    map:{name:'MAP (11-52-00; exemplo)',n:11,p:52,k:0,kind:'mineral'},
    dap:{name:'DAP (18-46-00; exemplo)',n:18,p:46,k:0,kind:'mineral'},
    kcl:{name:'Cloreto de potássio (60% K₂O; exemplo)',n:0,p:0,k:60,kind:'mineral'},
    k2so4:{name:'Sulfato de potássio (50% K₂O; exemplo)',n:0,p:0,k:50,kind:'mineral'},
    npk1:{name:'NPK 04-20-14 (exemplo)',n:4,p:20,k:14,kind:'mineral'},
    npk2:{name:'NPK 05-15-20 (exemplo)',n:5,p:15,k:20,kind:'mineral'},
    cama:{name:'Cama de frango — informar análise',n:null,p:null,k:null,kind:'organico'},
    esterco:{name:'Esterco bovino — informar análise',n:null,p:null,k:null,kind:'organico'},
    composto:{name:'Composto orgânico — informar análise',n:null,p:null,k:null,kind:'organico'},
    organomineral:{name:'Organomineral — informar rótulo',n:null,p:null,k:null,kind:'organomineral'},
    personalizado:{name:'Outro / composição personalizada',n:null,p:null,k:null,kind:'custom'}
  };
  const TOOLS={
    semeadura:{title:'Semeadura',icon:'🌾',description:'Estime quantas sementes distribuir por metro e por hectare para atingir a população-alvo.'},
    populacao:{title:'População de plantas',icon:'🌱',description:'Estime o número de plantas por hectare a partir dos espaçamentos.'},
    calagem:{title:'Necessidade de calagem',icon:'🪨',description:'Método da elevação da saturação por bases, com CTC, V atual, V desejado e PRNT.'},
    gessagem:{title:'Gessagem agrícola',icon:'🧱',description:'Estimativa didática por teor de argila. A indicação de gesso depende de análise em profundidade.'},
    fertilizante:{title:'Fertilizantes e adubação',icon:'🧪',description:'Converta uma dose conhecida de nutriente na quantidade de fertilizante comercial.'},
    pulverizacao:{title:'Regulagem de pulverizador',icon:'💧',description:'Calcule exclusivamente volume de calda em L/ha a partir de vazão, velocidade e espaçamento.'},
    produtividade:{title:'Estimativa de produtividade',icon:'📈',description:'Estime colheita por componentes de rendimento ou por massa coletada em área conhecida.'}
  };
  // Faixas de CONFERÊNCIA, não de recomendação técnica. Somente o milho
  // começa com uma faixa demonstrativa; demais culturas exigem configuração local.
  const RANGE_DEMO = { milho: { min: 30000, max: 110000 } };
  const rangesKey = 'lf-agrotech-populacao-faixas-v1';
  function storedRanges(){ try{ const x=JSON.parse(localStorage.getItem(rangesKey)||'{}');return x&&typeof x==='object'?x:{}; }catch(_){return {};} }
  function rangeForCrop(){
    const crop=$('#crop').value, saved=storedRanges();
    return Object.hasOwn(saved,crop)?saved[crop]:(RANGE_DEMO[crop]||null);
  }
  function saveRanges(){
    const crop=$('#crop').value, min=num($('#rangeMin').value), max=num($('#rangeMax').value);
    if(!Number.isFinite(min)||!Number.isFinite(max)||min<=0||max<=min||max>1000000000){
      $('#rangeSaveStatus').textContent='Informe limites positivos; o máximo deve ser maior que o mínimo.';return;
    }
    try{const stored=storedRanges();stored[crop]={min,max};localStorage.setItem(rangesKey,JSON.stringify(stored));$('#rangeSaveStatus').textContent='Faixa salva neste navegador para esta cultura.';}
    catch(_){$('#rangeSaveStatus').textContent='Não foi possível salvar no navegador. A faixa continua válida nesta sessão.';}
    updatePopulationViews();
  }
  function resetRange(){
    const crop=$('#crop').value;
    try{const stored=storedRanges();delete stored[crop];localStorage.setItem(rangesKey,JSON.stringify(stored));}catch(_){}
    loadRangeIntoInputs();
    $('#rangeSaveStatus').textContent=RANGE_DEMO[crop]?'Faixa demonstrativa restaurada.':'Sem faixa inicial para esta cultura.';
    updatePopulationViews();
  }
  function loadRangeIntoInputs(){
    if(!$('#rangeMin'))return;
    const r=rangeForCrop();$('#rangeMin').value=r?fmt0(r.min):'';$('#rangeMax').value=r?fmt0(r.max):'';
    const crop=$('#crop').selectedOptions[0]?.textContent||'a cultura';
    $('#rangeInfo').textContent=r?`Cultura: ${crop}. Limites em uso: ${fmt0(r.min)} a ${fmt0(r.max)} plantas/ha. ${storedRanges()[$('#crop').value]?'Faixa personalizada salva.':'Faixa apenas demonstrativa; revise antes de utilizar.'} Não é recomendação de plantio.`:`Cultura: ${crop}. Não existe faixa inicial. Informe limites validados para sua cultivar, região e sistema de manejo.`;
    $('#rangeSaveStatus').textContent='';
  }
  function populationWarning(densityHa){
    const rMin=num($('#rangeMin')?.value),rMax=num($('#rangeMax')?.value);
    if(!Number.isFinite(rMin)||!Number.isFinite(rMax)||rMin<=0||rMax<=rMin) return '';
    if(densityHa<rMin) return `A população de ${fmt0(densityHa)} plantas/ha está abaixo da faixa de conferência cadastrada (${fmt0(rMin)}–${fmt0(rMax)}). Confira o valor informado.`;
    if(densityHa>rMax) return `A população de ${fmt0(densityHa)} plantas/ha está acima da faixa de conferência cadastrada (${fmt0(rMin)}–${fmt0(rMax)}). Confira o valor informado.`;
    return '';
  }
  function currentDensityHa(){
    if(tool==='semeadura'){
      const input=num($('#seedDensity')?.value);
      return Number.isFinite(input) ? input*($('#seedUnit').value==='m2'?10000:1) : NaN;
    }
    if(tool==='populacao'){
      const r=num($('#rowSpace')?.value),p=num($('#plantSpace')?.value),n=num($('#plantsPerSpot')?.value);
      return r>0&&p>0&&n>0 ? 10000*n/(r*p) : NaN;
    }
    return NaN;
  }
  const populationRangeHtml=()=>`<div class="population-range-box">
    <details class="population-range-editor" open><summary>Configurar faixa de conferência da cultura <span class="range-config-label">Limites editáveis · plantas/ha</span></summary>
      <p id="rangeInfo" class="inline-hint">Estes limites são apenas para alertas e devem ser revisados conforme cultivar e manejo. Não são recomendações universais.</p>
      <div class="range-inputs">${field('rangeMin','Limite mínimo','plantas/ha')}${field('rangeMax','Limite máximo','plantas/ha')}</div>
      <p class="inline-hint">Os alertas usam os limites informados acima. Clique em <strong>Salvar faixa</strong> para conservar esses valores para a cultura selecionada neste navegador.</p>
      <div class="range-actions"><button type="button" class="secondary-action range-save-btn" id="savePopulationRange">Salvar faixa da cultura</button><button type="button" class="secondary-action" id="resetPopulationRange">Restaurar padrão</button></div>
      <p id="rangeSaveStatus" class="inline-hint" role="status"></p>
    </details><p id="populationAlert" class="population-alert" role="status" aria-live="polite"></p>
  </div>`;
  function updatePopulationViews(){
    if(tool!=='semeadura'&&tool!=='populacao')return;
    const ha=currentDensityHa(),alert=$('#populationAlert');
    if(Number.isFinite(ha)&&ha>0){
      const warning=populationWarning(ha);alert.textContent=warning||`População: ${fmt2(ha)} plantas/ha (${fmt2(ha/10000)} plantas/m²). ${$('#rangeMin').value&&$('#rangeMax').value?'Confira os limites locais e a cultivar.':'Cadastre uma faixa de referência para ativar alertas.'}`;
      alert.classList.toggle('is-warning',Boolean(warning));
    }else{alert.textContent='Informe uma população válida para visualizar a conferência.';alert.classList.remove('is-warning');}
    if(tool!=='semeadura')return;
    const showUnit=$('#seedUnit').value==='ha';
    $('#populationConversion').textContent=Number.isFinite(ha)&&ha>0 ?
      (showUnit?`${fmt2(ha)} plantas/ha = ${fmt2(ha/10000)} plantas/m²`:`${fmt2(ha/10000)} plantas/m² = ${fmt2(ha)} plantas/ha`):'Informe um número válido para visualizar a conversão.';
    const spacing=num($('#seedSpacing').value),g=num($('#seedGerm').value),loss=num($('#seedLoss').value);
    const good=Number.isFinite(ha)&&ha>0&&spacing>0&&g>0&&g<=100&&loss>=0&&loss<100;
    $('#spacingValue').textContent=spacing>0?fmt2(spacing)+' m':'—';
    $('#spacingSeedValue').textContent=good?fmt2(ha/10000*spacing/((g/100)*(1-loss/100)))+' sementes/m':'—';
  }
  function bindPopulationFeatures(){
    loadRangeIntoInputs();
    $('#rangeMin').addEventListener('input',updatePopulationViews);
    $('#rangeMax').addEventListener('input',updatePopulationViews);
    $('#savePopulationRange').addEventListener('click',saveRanges);
    $('#resetPopulationRange').addEventListener('click',resetRange);
    const ids=tool==='semeadura'?['seedDensity','seedSpacing','seedGerm','seedLoss']:['rowSpace','plantSpace','plantsPerSpot'];
    ids.forEach(id=>$('#'+id).addEventListener('input',updatePopulationViews));
    if(tool==='semeadura'){
      seedUnitPrevious='ha';
      $('#seedUnit').addEventListener('change',()=>{
        const next=$('#seedUnit').value, raw=num($('#seedDensity').value);
        if(Number.isFinite(raw)){
          let converted=next==='m2'?raw/10000:raw*10000;
          $('#seedDensity').value=converted.toLocaleString('pt-BR',{useGrouping:false,maximumFractionDigits:10});
        }
        seedUnitPrevious=next;updatePopulationViews();
      });
    }
    updatePopulationViews();
  }
  let tool='semeadura', resultText='', ibgeTicket=0, seedUnitPrevious='ha';
  function setError(msg){$('#formError').textContent=msg;$('#formError').hidden=false;$('#resultState').textContent='Confira os dados';}
  function resetOutput(){$('#outputTitle').textContent='Aguardando dados';$('#mainMetric').textContent='—';$('#mainUnit').textContent='';$('#mainMetricLabel').textContent='RESULTADO PRINCIPAL';$('#metricHint').textContent='Preencha os campos e clique em Calcular.';$('#resultBreakdown').replaceChildren();$('#resultBreakdown').textContent='As quantidades da área e os valores complementares serão exibidos aqui.';$('#formulaText').textContent='Os passos serão mostrados após o cálculo.';$('#formulaDetail').textContent='As unidades são verificadas antes do resultado.';$('#resultWarning').textContent='Esta calculadora não substitui recomendação agronômica regional nem análise profissional do solo.';$('#resultState').textContent='Pronto para calcular';$('#copyStatus').textContent='';resultText='';}
  function setTool(which){
    if(!TOOLS[which])return;
    tool=which;
    $$('.tool-btn').forEach(el=>{const active=el.dataset.tool===which;el.classList.toggle('is-active',active);el.setAttribute('aria-pressed',String(active));});
    $('#operationTitle').textContent=TOOLS[tool].title;
    $('#operationSubtitle').textContent=TOOLS[tool].description;
    $('#operationIcon').textContent=TOOLS[tool].icon;
    const sugar=$('#crop').value==='cana';
    let html='';
    switch(tool){
    case 'semeadura': html=`<div class="seeding-panel">
      <div class="seeding-input-grid">${fieldSelect('seedUnit','Unidade da população',[['ha','Plantas por hectare (plantas/ha)'],['m2','Plantas por metro quadrado (plantas/m²)']])}
      ${field('seedDensity','População desejada','planta(s)','70000','Digite 70.000 ou 7, conforme a unidade selecionada.')}
      <p class="density-conversion" id="populationConversion" aria-live="polite"></p>
      ${field('seedSpacing','Espaçamento entre linhas','m','0,50')}
      ${field('seedGerm','Germinação','%','90')}
      ${field('seedLoss','Perdas adicionais no campo','%','10','Não contabilize novamente perdas incluídas na germinação.')}</div>
      ${populationRangeHtml()}
      <div class="spacing-explainer"><div class="spacing-title">Como o espaçamento influencia?</div>
        <div class="spacing-metrics"><div><small>Espaçamento entre linhas</small><strong id="spacingValue">—</strong></div><div><small>Sementes necessárias por metro</small><strong id="spacingSeedValue">—</strong></div></div>
        <div class="seed-diagram" role="img" aria-label="Esquema ilustrativo de três linhas de plantio paralelas, com pontos verdes representando sementes, sem escala.">
          <div class="seed-diagram-row">${'<i></i>'.repeat(10)}</div>
          <div class="seed-diagram-row">${'<i></i>'.repeat(10)}</div>
          <div class="seed-diagram-row">${'<i></i>'.repeat(10)}</div>
        </div>
        <p>Se o espaçamento entre linhas aumenta, são necessárias mais sementes por metro de linha para manter a <strong>mesma população por hectare</strong>. Esquema ilustrativo, sem escala.</p>
      </div></div>`;break;
    case 'populacao': html=field('rowSpace','Espaçamento entre linhas','m','0,50')+field('plantSpace','Espaçamento entre plantas','m','0,20')+field('plantsPerSpot','Plantas por ponto/cova','pl./ponto','1','Se usar uma planta por cova, mantenha 1.')+populationRangeHtml();break;
    case 'calagem': html=field('targetV','Meta de saturação (V₂)','%','','Informada no manual técnico aplicável; não é definida automaticamente.')+field('prnt','PRNT do calcário','%','80','Conforme o rótulo do produto.');break;
    case 'gessagem': html=fieldSelect('gypMethod','Critério de cálculo',[['anual','50 × argila (%) — culturas anuais'],['perene','75 × argila (%) — perenes']], 'Método exemplificativo; depende do ambiente radicular e região.')+field('clayDirect','Argila do solo','%','','Pode também preencher na seção Análise de solo.');break;
    case 'fertilizante': html=fieldSelect('product','Categoria / produto',Object.entries(PRODUCTS).map(([id,p])=>[id,p.name]))+fieldSelect('nutrient','Nutriente a atender',[['n','Nitrogênio (N)'],['p','Fósforo (P₂O₅)'],['k','Potássio (K₂O)']])+field('nutrientTarget','Dose-alvo do nutriente','kg/ha','','Dose previamente recomendada, não calculada automaticamente.')+field('bagWeight','Peso de uma embalagem','kg','50')+'<div class="fert-composition" id="fertComposition"><div class="fert-head">Garantias do produto (% em massa)</div><div class="field-grid three-cols">'+field('guaranteeN','N','%','45')+field('guaranteeP','P₂O₅','%','0')+field('guaranteeK','K₂O','%','0')+'</div><p id="fertNote" class="inline-hint">Verifique a composição no rótulo. Para orgânicos, use análise do produto e a fração efetivamente disponível.</p></div>'+field('availableFraction','Nutriente disponível na etapa avaliada','%','100','Para orgânicos, ajuste apenas com critério técnico específico.');break;
    case 'pulverizacao': html=field('nozzleFlow','Vazão de 1 ponta','L/min','1')+field('tractorSpeed','Velocidade do pulverizador','km/h','6')+field('nozzleSpacing','Distância entre pontas / faixa','m','0,50')+field('tankCapacity','Capacidade do tanque','L','600');break;
    case 'produtividade': html=(sugar?'':'')+fieldSelect('yieldMethod','Método',[['componentes','Componentes de rendimento (grãos)'],['amostra','Massa colhida em área amostrada']])+`<div class="yield-components" id="yieldComponents">${field('harvestDensity','Plantas estabelecidas','plantas/m²','7')+field('structures','Espigas/panículas/vagens por planta','un./planta','1')+field('grains','Grãos por estrutura','un.','450')+field('thousand','Massa de mil grãos','g','300')}</div><div class="yield-sample" id="yieldSample" hidden>${field('sampleKg','Massa colhida na amostra','kg','15')+field('sampleArea','Área efetivamente colhida','m²','10')}</div>`;break;
    }
    $('#operationFields').innerHTML=html;
    if(tool==='fertilizante') {$('#product').addEventListener('change',updateProduct);$('#nutrient').addEventListener('change',updateFertNote);updateProduct();}
    if(tool==='produtividade') {if(sugar) $('#yieldMethod').value='amostra'; $('#yieldMethod').addEventListener('change',()=>toggleYield());toggleYield();}
    if(tool==='gessagem' && $('#soilClay').value) $('#clayDirect').value=$('#soilClay').value;
    if(tool==='semeadura'||tool==='populacao') bindPopulationFeatures();
    resetOutput();
  }
  function updateProduct(){const p=PRODUCTS[$('#product').value];if(!p)return;$('#guaranteeN').value=p.n??'';$('#guaranteeP').value=p.p??'';$('#guaranteeK').value=p.k??'';$('#availableFraction').value=p.kind==='mineral'?'100':'';updateFertNote();}
  function updateFertNote(){const p=PRODUCTS[$('#product').value];const note=$('#fertNote');note.textContent=p.kind==='mineral'?'Garantias ilustrativas: confirme os teores reais no rótulo do fabricante.':'Informe os teores medidos (base de massa consistente) e a fração disponível respaldada por análise/referência técnica. Não são usados valores padrão para adubos orgânicos.';}
  function toggleYield(){const component=$('#yieldMethod').value==='componentes';$('#yieldComponents').hidden=!component;$('#yieldSample').hidden=component;}
  function validateArea(){return requiredNumber('area',{positive:true,max:1e9,label:'Área (ha)'});}
  function soilNum(id,params){const v=$("#"+id).value.trim();if(!v)throw Error(`Para este cálculo, preencha “${params.label}” em Análise de solo.`);return requiredNumber(id,params);}
  function compute(){
    const area=validateArea();let answer;
    switch(tool){
    case 'semeadura':{
      if($('#crop').value==='cana')throw Error('A semeadura por sementes comerciais não é aplicável à implantação convencional de cana-de-açúcar. Utilize População ou Produtividade (amostra) e um método específico de mudas/rebolos.');
      const supplied=requiredNumber('seedDensity',{positive:true,max:1000000000,label:'População-alvo'}),d=$('#seedUnit').value==='ha'?supplied/10000:supplied,s=requiredNumber('seedSpacing',{positive:true,max:20,label:'Espaçamento entre linhas'}),g=requiredNumber('seedGerm',{positive:true,max:100,label:'Germinação'}),l=requiredNumber('seedLoss',{min:0,max:99.99,label:'Perdas adicionais'});
      const factor=(g/100)*(1-l/100),seedsM=d*s/factor,seedsHa=d*10000/factor,warning=populationWarning(d*10000);
      answer={label:'SEMENTES POR METRO DE LINHA',main:seedsM,unit:'sementes/m',hint:'Distribuição teórica para atingir a população-alvo.',details:[['População-alvo',fmt2(d*10000)+' plantas/ha · '+fmt2(d)+' plantas/m²'],['Sementes por hectare',fmt2(seedsHa)+' sementes/ha'],['Plantas esperadas por metro',fmt2(d*s)+' plantas/m'],['Total na área',fmt0(seedsHa*area)+' sementes']],formula:`(${fmt(d,6)} × ${fmt(s,6)}) ÷ [(${fmt(g,4)} ÷ 100) × (1 − ${fmt(l,4)} ÷ 100)] = ${fmt2(seedsM)} sementes/m`,method:'Germinação e perdas adicionais são fatores independentes. O cálculo interno mantém a precisão; valores exibidos são arredondados.',warning:(warning?warning+' ':'')+'Faixas servem apenas para sinalizar possíveis erros de digitação. Confirme população recomendada para cultivar, região e sistema de cultivo.'};break;
    }
    case 'populacao':{
      const r=requiredNumber('rowSpace',{positive:true,max:100,label:'Espaçamento entre linhas'}),p=requiredNumber('plantSpace',{positive:true,max:100,label:'Espaçamento entre plantas'}),n=requiredNumber('plantsPerSpot',{positive:true,max:1000,label:'Plantas por ponto'}),density=10000*n/(r*p);
      const populationNotice=populationWarning(density);
      answer={label:'POPULAÇÃO ESTIMADA',main:density,unit:'plantas/ha',hint:'População geométrica, desconsiderando falhas.',details:[['Densidade',fmt2(density/10000)+' plantas/m²'],['Total na área',fmt0(density*area)+' plantas'],['Espaçamento utilizado',fmt(r,3)+' m × '+fmt(p,3)+' m']],formula:`10.000 × ${fmt(n)} ÷ (${fmt(r,3)} × ${fmt(p,3)}) = ${fmt2(density)} plantas/ha`,method:'Aplica-se quando há pontos/covas uniformemente distribuídos; para cana e transplantio, considere o sistema real de implantação.',warning:(populationNotice?populationNotice+' ':'')+'Esta estimativa geométrica não é uma recomendação de população por cultura. Ajuste a faixa de conferência conforme dados locais.'};break;
    }
    case 'calagem':{
      const ctc=soilNum('soilCTC',{positive:true,max:100,label:'CTC a pH 7'}),v1=soilNum('soilV',{min:0,max:100,label:'V atual'}),v2=requiredNumber('targetV',{min:0,max:100,label:'V desejado'}),prnt=requiredNumber('prnt',{positive:true,max:200,label:'PRNT'});
      const tons=Math.max(0,ctc*(v2-v1)/prnt);
      answer={label:'CALCÁRIO — ESTIMATIVA',main:tons,unit:'t/ha',hint:v2<=v1?'Pelo método escolhido, não há incremento positivo de V a calcular.':'Estimativa para o método de saturação por bases.',details:[['Total na área',fmt(tons*area,3)+' t'],['Equivalente por hectare',fmt(tons*1000,0)+' kg/ha'],['V atual → meta',`${fmt(v1)}% → ${fmt(v2)}%`]],formula:`Máx(0; ${fmt(ctc)} × (${fmt(v2)} − ${fmt(v1)}) ÷ ${fmt(prnt)}) = ${fmt(tons,3)} t/ha`,method:'CTC em cmolc/dm³, V e PRNT expressos em %. Fórmula referida à camada de aproximadamente 0–20 cm, conforme método técnico.',warning:'A meta de V₂, a camada amostrada, o modo de aplicação e a adequação do método dependem da recomendação regional e do sistema de manejo. Não adote a dose sem validação.'};break;
    }
    case 'gessagem':{
      const maybe=$('#clayDirect').value.trim()||$('#soilClay').value.trim();if(!maybe)throw Error('Informe o teor de argila (%) no campo do cálculo ou na análise de solo.');
      const clay=num(maybe);if(!Number.isFinite(clay)||clay<0||clay>100)throw Error('O teor de argila deve estar entre 0% e 100%.');
      const rate=$('#gypMethod').value==='perene'?75:50,kg=rate*clay;
      answer={label:'GESSO — ESTIMATIVA TEXTURAL',main:kg,unit:'kg/ha',hint:'Aplicação ilustrativa da fórmula por textura; não determina, por si, necessidade de gesso.',details:[['Total na área',fmt(kg*area,0)+' kg'],['Equivalente',fmt(kg/1000,3)+' t/ha'],['Argila',fmt(clay)+'%']],formula:`${fmt(rate,0)} × ${fmt(clay)} = ${fmt(kg,0)} kg/ha`,method:'Critério textural descrito para culturas anuais (50×argila) e perenes (75×argila). Selecione o enquadramento conforme o manual; a cana-de-açúcar requer avaliação específica.',warning:'O gesso não substitui a calagem. A indicação de gessagem depende da análise química do subsolo (Ca, Al, saturação por Al), profundidade e condições locais.'};break;
    }
    case 'fertilizante':{
      const k=$('#nutrient').value, target=requiredNumber('nutrientTarget',{positive:true,max:1e8,label:'Dose-alvo do nutriente'}),bag=requiredNumber('bagWeight',{positive:true,max:100000,label:'Peso de embalagem'}),a=requiredNumber('availableFraction',{positive:true,max:100,label:'Fração disponível'});
      const values={n:requiredNumber('guaranteeN',{min:0,max:100,label:'N (%)'}),p:requiredNumber('guaranteeP',{min:0,max:100,label:'P₂O₅ (%)'}),k:requiredNumber('guaranteeK',{min:0,max:100,label:'K₂O (%)'})};
      const fraction=values[k]/100*a/100;
      if(fraction<=0)throw Error('O produto selecionado não contém teor positivo disponível do nutriente que deseja atender. Confira a composição e a seleção.');
      const amount=target/fraction,total=amount*area,prod=PRODUCTS[$('#product').value],all={n:'N',p:'P₂O₅',k:'K₂O'};
      const delivered=Object.entries(values).map(([key,val])=>`${all[key]}: ${fmt(amount*val/100,2)} kg/ha`).join(' · ');
      answer={label:'FERTILIZANTE COMERCIAL',main:amount,unit:'kg/ha',hint:`Produto: ${prod.name}. Dose dimensionada exclusivamente para ${all[k]}.`,details:[['Total na área',fmt(total,2)+' kg'],['Embalagens equivalentes',fmt(total/bag,2)+' unidades'],['Nutrientes totais fornecidos',delivered]],formula:`${fmt(target,2)} ÷ [(${fmt(values[k],2)} ÷ 100) × (${fmt(a,2)} ÷ 100)] = ${fmt(amount,2)} kg/ha`,method:'A garantia é informada em porcentagem de massa; o fator de disponibilidade é informado pelo usuário. Nutrientes N, P₂O₅ e K₂O não são equivalentes a P e K elementares.',warning:'A dose-alvo não é determinada pela plataforma. Uma fórmula NPK pode atender a um nutriente e fornecer quantidades acima ou abaixo da necessidade dos outros. Orgânicos requerem análise do produto, disponibilidade e base de umidade coerente.'};break;
    }
    case 'pulverizacao':{
      const q=requiredNumber('nozzleFlow',{positive:true,max:1000,label:'Vazão do bico'}),v=requiredNumber('tractorSpeed',{positive:true,max:100,label:'Velocidade'}),e=requiredNumber('nozzleSpacing',{positive:true,max:100,label:'Espaçamento/ faixa'}),tank=requiredNumber('tankCapacity',{positive:true,max:100000,label:'Tanque'}),volume=q*600/(v*e);
      answer={label:'VOLUME DE CALDA',main:volume,unit:'L/ha',hint:'Cálculo geométrico de volume de aplicação; não calcula dose de defensivo.',details:[['Volume para a área',fmt(volume*area,2)+' L'],['Cobertura teórica por tanque',fmt(tank/volume,2)+' ha'],['Tanques teóricos para a área',fmt(volume*area/tank,2)]],formula:`(${fmt(q,3)} × 600) ÷ (${fmt(v,2)} × ${fmt(e,3)}) = ${fmt(volume,2)} L/ha`,method:'q em L/min por ponta; v em km/h; e em metros. Fator 600 faz a conversão de unidades.',warning:'Confira vazão real, pressão, condições ambientais e bula dos produtos. Volume de calda não corresponde à dose de ingrediente ativo ou de produto formulado.'};break;
    }
    case 'produtividade':{
      if($('#yieldMethod').value==='componentes'){
        if($('#crop').value==='cana') throw Error('Para cana-de-açúcar, use o método de massa amostrada em área conhecida.');
        const d=requiredNumber('harvestDensity',{positive:true,max:100000,label:'Plantas estabelecidas'}),s=requiredNumber('structures',{positive:true,max:100000,label:'Estruturas por planta'}),g=requiredNumber('grains',{positive:true,max:1000000,label:'Grãos por estrutura'}),m=requiredNumber('thousand',{positive:true,max:100000,label:'Massa de mil grãos'});
        const kgha=d*s*g*m/100;
        answer={label:'PRODUTIVIDADE ESTIMADA',main:kgha,unit:'kg/ha',hint:'Modelo teórico para culturas de grãos; validar amostragem e perdas.',details:[['Toneladas por hectare',fmt(kgha/1000,2)+' t/ha'],['Sacas de 60 kg por hectare',fmt(kgha/60,2)+' sc/ha (base 60 kg)'],['Total na área',fmt(kgha*area/1000,2)+' t']],formula:`(${fmt(d)} × ${fmt(s)} × ${fmt(g)} × ${fmt(m)} × 10.000) ÷ 1.000.000 = ${fmt(kgha,1)} kg/ha`,method:'Plantas/m² × estruturas/planta × grãos/estrutura × massa de mil grãos (g), convertido para kg/ha.',warning:'Resultado sujeito a perdas de campo, impurezas, umidade de grãos e representatividade da amostra. A unidade de saca depende da cultura e da praça.'};
      }else{
        const kg=requiredNumber('sampleKg',{positive:true,max:1e12,label:'Massa da amostra'}),m2=requiredNumber('sampleArea',{positive:true,max:1e10,label:'Área amostrada'}),kgha=kg/m2*10000;
        answer={label:'PRODUTIVIDADE ESTIMADA',main:kgha,unit:'kg/ha',hint:'Extrapolação simples da massa colhida na área medida.',details:[['Toneladas por hectare',fmt(kgha/1000,2)+' t/ha'],['Total na área',fmt(kgha*area/1000,2)+' t'],['Amostragem',fmt(kg)+' kg em '+fmt(m2)+' m²']],formula:`(${fmt(kg)} kg ÷ ${fmt(m2)} m²) × 10.000 = ${fmt(kgha,1)} kg/ha`,method:'Amostra deve ser representativa; massa e umidade devem ser padronizadas para comparações.',warning:'Uma única amostra pode superestimar ou subestimar a produtividade. Para cana, expresse resultado em toneladas de colmos/ha e documente método de amostragem.'};
      }break;
    }
    }
    if(!answer||!Number.isFinite(answer.main)||answer.main>1e25)throw Error('Não foi possível calcular com esses valores. Revise os parâmetros.');
    return {answer,area};
  }
  // Relatório A4 independente do dashboard, preenchido somente com o cálculo confirmado.
  function appendPrintRow(tbody,label,value){
    const row=document.createElement('tr'),head=document.createElement('th'),cell=document.createElement('td');
    head.scope='row';head.textContent=label;cell.textContent=String(value??'—');row.append(head,cell);tbody.appendChild(row);
  }
  function parameterSnapshot(){
    const rows=[];
    $$('#operationFields .calc-field').forEach(group=>{
      const ctrl=group.querySelector('input, select');
      if(!ctrl || ctrl.closest('[hidden]') || group.closest('[hidden]')) return;
      if(ctrl.id==='rangeMin'||ctrl.id==='rangeMax')return;
      const label=group.querySelector('label')?.textContent?.trim()||ctrl.id;
      const value=ctrl.tagName==='SELECT'?ctrl.selectedOptions[0]?.textContent:ctrl.value.trim();
      if(!value)return;
      const unit=group.querySelector('.field-unit')?.textContent?.trim();
      rows.push([label,unit?`${value} ${unit}`:value]);
    });
    if(tool==='semeadura'||tool==='populacao'){
      const min=num($('#rangeMin').value),max=num($('#rangeMax').value);
      rows.push(['Faixa de conferência — cultura',Number.isFinite(min)&&Number.isFinite(max)&&min>0&&max>min
        ?`${fmt0(min)} a ${fmt0(max)} plantas/ha (configuração para alerta, não recomendação)`
        :'Não configurada']);
      const density=currentDensityHa();
      if(Number.isFinite(density)&&density>0)rows.push(['População considerada',`${fmt2(density)} plantas/ha · ${fmt2(density/10000)} plantas/m²`]);
    }
    if(tool==='calagem'){
      [['soilCTC','CTC pH 7 (cmolc/dm³)'],['soilV','V atual (%)'],['soilDepth','Camada amostrada']]
        .forEach(([id,label])=>{const el=$('#'+id);if(el?.value)rows.push([label,el.tagName==='SELECT'?el.selectedOptions[0].textContent:el.value]);});
    }
    if(tool==='gessagem' && !$('#clayDirect')?.value.trim() && $('#soilClay')?.value.trim()){
      rows.push(['Argila do solo (%)',$('#soilClay').value.trim()]);
    }
    return rows;
  }
  function populatePrintReport(answer,area){
    $('#printReportTitle').textContent=TOOLS[tool].title;
    $('#printReportDate').textContent=`Emitido em ${new Date().toLocaleString('pt-BR')}`;
    const context=$('#printContextRows'),params=$('#printParameterRows'),results=$('#printResultRows');
    [context,params,results].forEach(el=>el.replaceChildren());
    const city=$('#cityManual').hidden?$('#city').selectedOptions[0]?.textContent:$('#cityManual').value.trim();
    const validCity=city && !/carregando|selecione|nenhum munic[ií]pio/i.test(city);
    const uf=$('#uf').value;
    [['Cultura',$('#crop').selectedOptions[0].textContent],['Estado e município',`${validCity?city:'Não informado'} / ${uf}`],
     ['Sistema hídrico',$('#water').selectedOptions[0].textContent],['Sistema de implantação',$('#planting').selectedOptions[0].textContent],
     ['Área do cálculo',`${fmt2(area)} ha`]]
      .forEach(([k,v])=>appendPrintRow(context,k,v));
    parameterSnapshot().forEach(([k,v])=>appendPrintRow(params,k,v));
    appendPrintRow(results,answer.label,`${tool==='semeadura'||tool==='populacao'?fmt2(answer.main):fmt(answer.main,answer.main<1?4:2)} ${answer.unit}`);
    answer.details.forEach(([k,v])=>appendPrintRow(results,k,v));
    $('#printFormula').textContent=answer.formula;
    $('#printMethod').textContent=answer.method;
    $('#printWarning').textContent=answer.warning||'Confira critérios técnicos para sua região e cultura.';
  }
  function showResult({answer,area}){
    $('#outputTitle').textContent=TOOLS[tool].title;
    $('#mainMetricLabel').textContent=answer.label;
    $('#mainMetric').textContent=tool==='semeadura'||tool==='populacao'?fmt2(answer.main):fmt(answer.main,answer.main<1?4:2);
    $('#mainUnit').textContent=answer.unit;
    $('#metricHint').textContent=answer.hint;
    $('#resultBreakdown').replaceChildren();
    answer.details.forEach(([l,v])=>{let div=document.createElement('div');let t=document.createElement('span');t.textContent=l;let strong=document.createElement('strong');strong.textContent=v;div.append(t,strong);$('#resultBreakdown').append(div);});
    $('#formulaText').textContent=answer.formula;
    $('#formulaDetail').textContent=answer.method;
    $('#resultWarning').textContent=answer.warning||'Resultado matemático para os dados informados. Não substitui recomendação técnica regional.';
    $('#resultState').textContent='Cálculo concluído';
    populatePrintReport(answer,area);
    let city=$('#cityManual').hidden?$('#city').selectedOptions[0]?.textContent:$('#cityManual').value.trim();
    const selectedCrop=$('#crop').selectedOptions[0].textContent;
    resultText=`LF AgroTech — ${TOOLS[tool].title}\nCultura: ${selectedCrop}\nLocal: ${city||'Não informado'} / ${$('#uf').value}\nSistema: ${$('#water').value} / ${$('#planting').selectedOptions[0].textContent}\nÁrea: ${fmt(area)} ha\n${answer.label}: ${fmt(answer.main,3)} ${answer.unit}\n${answer.details.map(([k,v])=>k+': '+v).join('\n')}\nFórmula: ${answer.formula}\nAtenção: ${answer.warning||'Estimativa de apoio. Confirmar referência técnica.'}`;
    $('#resultado-calculo').scrollIntoView({behavior:'smooth',block:'start'});
  }
  // API oficial de localidades do IBGE: carregamento por UF com opção de fallback manual.
  async function loadCities(){
    const state=$('#uf').value, ticket=++ibgeTicket,select=$('#city');select.replaceChildren(new Option('Carregando municípios…',''));
    $('#cityManual').hidden=true;select.hidden=false;$('#cityMessage').textContent='Municípios via API pública do IBGE.';
    try{
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),9000);
      let response;try{response=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/'+encodeURIComponent(state)+'/municipios?orderBy=nome',{signal:controller.signal});}finally{clearTimeout(timeout);}
      if(!response.ok) throw Error('Falha de rede');
      const list=await response.json();if(ticket!==ibgeTicket)return;
      if(!Array.isArray(list)||!list.length)throw Error('Sem municípios');
      select.replaceChildren(new Option('Selecione o município',''));
      list.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).forEach(m=>select.add(new Option(m.nome,m.nome)));
      const preferred=state==='DF'?'Brasília':'';if(preferred)select.value=preferred;
    }catch(_){if(ticket!==ibgeTicket)return;select.hidden=true;$('#cityManual').hidden=false;$('#cityMessage').textContent='Não foi possível carregar pelo IBGE; digite o município manualmente.';}
  }
  const sidebar=$('#sidebar'),backdrop=$('#sidebarBackdrop'),toggle=$('#mobileMenuToggle');
  function closeMenu(){sidebar.classList.remove('is-open');backdrop.hidden=true;toggle.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',()=>{const v=!sidebar.classList.contains('is-open');sidebar.classList.toggle('is-open',v);backdrop.hidden=!v;toggle.setAttribute('aria-expanded',String(v));});
  backdrop.addEventListener('click',closeMenu);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  $$('.nav-link').forEach(a=>a.addEventListener('click',closeMenu));
  UF.forEach(([id,name])=>$('#uf').add(new Option(name+' ('+id+')',id)));
  $('#uf').value='GO';loadCities();
  $('#uf').addEventListener('change',loadCities);
  $('#water').addEventListener('change',()=>{$('#waterDetail').hidden=$('#water').value!=='irrigado';});
  $('#crop').addEventListener('change',()=>{if(tool==='produtividade')setTool('produtividade');if(tool==='semeadura'&&$('#crop').value==='cana'){$('#operationSubtitle').textContent='Para cana-de-açúcar, utilize População (covas/mudas) ou Produtividade por massa amostrada. A semeadura por sementes não é apropriada.';}else if(tool==='semeadura'){$('#operationSubtitle').textContent=TOOLS.semeadura.description;}if(tool==='semeadura'||tool==='populacao'){loadRangeIntoInputs();updatePopulationViews();}});
  $$('.tool-btn').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
  $('#agroForm').addEventListener('submit',e=>{
    e.preventDefault();$('#formError').hidden=true;$$('[aria-invalid="true"]').forEach(el=>el.removeAttribute('aria-invalid'));
    try{const out=compute();showResult(out);}catch(err){setError(err.message||'Revise os dados informados.');}
  });
  $('#clearResult').addEventListener('click',()=>{resetOutput();$('#formError').hidden=true;});
  $('#copyResult').addEventListener('click',async()=>{if(!resultText){$('#copyStatus').textContent='Calcule primeiro.';return;}try{await navigator.clipboard.writeText(resultText);$('#copyStatus').textContent='Resultado copiado.';}catch(_){$('#copyStatus').textContent='A cópia exige HTTPS ou permissão do navegador.';}});
  $('#printResult').addEventListener('click',()=>{if(!resultText){$('#copyStatus').textContent='Calcule primeiro para imprimir o relatório.';return;}window.print();});
  setTool('semeadura');
})();
