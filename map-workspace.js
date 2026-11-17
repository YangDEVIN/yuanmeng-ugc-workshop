const MapWorkspace=(()=>{
  const icons={map:'◫',export:'↓',blocks:'▦',import:'↑',reset:'⟲',top:'⊞',perspective:'◇',wire:'▧',follow:'⊙',route:'↝',spawn:'⚑',walk:'▶',pause:'Ⅱ',check:'✓',reference:'◩',roof:'⌂',action:'◎',edit:'✎',delete:'×',undo:'↶'};
  function decorate(target,key,label=target.textContent.trim()){
    const icon=document.createElement('span');
    icon.className='map-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[key];
    target.replaceChildren(icon,document.createTextNode(label));
  }
  function addIcons(root=document){
    for(const element of root.querySelectorAll('[data-icon]')) {
      if(element.querySelector('.map-icon'))continue;
      const icon=document.createElement('span');
      icon.className='map-icon';icon.setAttribute('aria-hidden','true');icon.textContent=icons[element.dataset.icon];
      element.prepend(icon);
    }
  }
  function tabs(container){
    const buttons=[...container.querySelectorAll('[role=tab]')];
    function select(current){
      for(const tab of buttons){
        const selected=tab===current;
        tab.tabIndex=selected?0:-1;
        tab.setAttribute('aria-selected',String(selected));
        document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;
      }
    }
    buttons.forEach((tab,i)=>{
      tab.addEventListener('click',()=>select(tab));
      tab.addEventListener('keydown',event=>{
        const index={Home:0,End:buttons.length-1,ArrowLeft:(i+buttons.length-1)%buttons.length,ArrowRight:(i+1)%buttons.length}[event.key];
        if(index===undefined)return;
        event.preventDefault();select(buttons[index]);buttons[index].focus();
      });
    });
    return {select};
  }
  function movement(container,held){
    function clear(){held.clear()}
    addEventListener('keydown',event=>{
      if(container.hidden||event.altKey||event.ctrlKey||event.metaKey||document.querySelector('dialog[open]')||
         event.target.matches?.('input,select,textarea,[role=tab]'))return;
      const key={w:'up',a:'left',s:'down',d:'right',arrowup:'up',arrowleft:'left',arrowdown:'down',arrowright:'right'}[event.key.toLowerCase()];
      if(key){held.add(key);event.preventDefault();}
    });
    addEventListener('keyup',event=>{
      const key={w:'up',a:'left',s:'down',d:'right',arrowup:'up',arrowleft:'left',arrowdown:'down',arrowright:'right'}[event.key.toLowerCase()];
      if(key)held.delete(key);
    });
    addEventListener('blur',clear);
    for(const button of container.querySelectorAll('[data-move]')){
      button.addEventListener('pointerdown',event=>{button.setPointerCapture(event.pointerId);held.add(button.dataset.move);});
      button.addEventListener('lostpointercapture',()=>held.delete(button.dataset.move));
      button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){held.add(button.dataset.move);event.preventDefault();}});
      button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter')held.delete(button.dataset.move);});
    }
  }
  function controlsBar(container){
    container.innerHTML=`<div class="map-dpad" role="group" aria-label="移动">
      <button type="button" data-move="up" aria-label="上移 W">↑</button>
      <button type="button" data-move="left" aria-label="左移 A">←</button>
      <button type="button" data-move="down" aria-label="下移 S">↓</button>
      <button type="button" data-move="right" aria-label="右移 D">→</button>
      </div><div class="map-control-actions">
      <button type="button" data-map-action data-icon="action" aria-keyshortcuts="E" disabled>操作</button>
      <button type="button" data-map-walk data-icon="walk" disabled>沿路线移动</button></div>`;
    addIcons(container);
    const action=container.querySelector('[data-map-action]'),walk=container.querySelector('[data-map-walk]');
    addEventListener('keydown',event=>{
      if(event.key.toLowerCase()!=='e'||event.repeat||event.altKey||event.ctrlKey||event.metaKey||
         container.hidden||action.disabled||document.querySelector('dialog[open]')||
         event.target.matches?.('input,select,textarea,[contenteditable],[role=tab]'))return;
      action.click();
    });
    return {action,walk};
  }
  return {addIcons,decorate,tabs,movement,controlsBar};
})();
