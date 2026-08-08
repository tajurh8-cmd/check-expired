(function(){
  const ensureRoot=()=>{
    let root=document.getElementById('expiUiRoot');
    if(root)return root;
    root=document.createElement('div');
    root.id='expiUiRoot';
    root.innerHTML=`
      <div id="expiToastWrap" class="expi-toast-wrap" aria-live="polite"></div>
      <div id="expiDialogBackdrop" class="expi-dialog-backdrop d-none" role="presentation">
        <div class="expi-dialog" role="dialog" aria-modal="true" aria-labelledby="expiDialogTitle">
          <div class="expi-dialog-icon" id="expiDialogIcon">!</div>
          <h3 id="expiDialogTitle">Konfirmasi</h3>
          <p id="expiDialogText"></p>
          <input id="expiDialogInput" class="expi-dialog-input d-none" autocomplete="off">
          <div class="expi-dialog-actions">
            <button id="expiDialogCancel" class="expi-btn expi-btn-secondary">Batal</button>
            <button id="expiDialogOk" class="expi-btn expi-btn-primary">Oke</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);
    return root;
  };

  function toast(message,type='success',duration=2400){
    ensureRoot();
    const wrap=document.getElementById('expiToastWrap');
    const el=document.createElement('div');
    const icon=type==='success'?'✓':type==='error'?'!':type==='warning'?'!':'i';
    el.className=`expi-toast expi-toast-${type}`;
    el.innerHTML=`<span class="expi-toast-icon">${icon}</span><span>${String(message??'')}</span>`;
    wrap.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),220)},duration);
  }

  function dialog({title='Konfirmasi',message='',okText='Oke',cancelText='Batal',danger=false,input=false,inputType='text',placeholder='',value=''}){
    ensureRoot();
    return new Promise(resolve=>{
      const backdrop=document.getElementById('expiDialogBackdrop');
      const titleEl=document.getElementById('expiDialogTitle');
      const textEl=document.getElementById('expiDialogText');
      const inputEl=document.getElementById('expiDialogInput');
      const ok=document.getElementById('expiDialogOk');
      const cancel=document.getElementById('expiDialogCancel');
      const icon=document.getElementById('expiDialogIcon');
      titleEl.textContent=title;
      textEl.textContent=message;
      ok.textContent=okText;
      cancel.textContent=cancelText;
      ok.className=`expi-btn ${danger?'expi-btn-danger':'expi-btn-primary'}`;
      icon.className=`expi-dialog-icon ${danger?'danger':''}`;
      inputEl.classList.toggle('d-none',!input);
      inputEl.type=inputType;
      inputEl.placeholder=placeholder;
      inputEl.value=value;
      backdrop.classList.remove('d-none');
      document.body.classList.add('expi-dialog-open');

      const cleanup=()=>{
        backdrop.classList.add('d-none');
        document.body.classList.remove('expi-dialog-open');
        ok.onclick=null;cancel.onclick=null;backdrop.onclick=null;document.onkeydown=null;
      };
      const done=v=>{cleanup();resolve(v)};
      ok.onclick=()=>done(input?inputEl.value:true);
      cancel.onclick=()=>done(input?null:false);
      backdrop.onclick=e=>{if(e.target===backdrop)done(input?null:false)};
      document.onkeydown=e=>{if(e.key==='Escape')done(input?null:false);if(e.key==='Enter'&&(!input||document.activeElement===inputEl))done(input?inputEl.value:true)};
      setTimeout(()=>input?inputEl.focus():ok.focus(),30);
    });
  }

  window.ExpiUI={
    toast,
    confirm:(message,opts={})=>dialog({title:opts.title||'Konfirmasi',message,okText:opts.okText||'Oke',cancelText:opts.cancelText||'Batal',danger:!!opts.danger}),
    prompt:(message,opts={})=>dialog({title:opts.title||'Input',message,okText:opts.okText||'Simpan',cancelText:opts.cancelText||'Batal',input:true,inputType:opts.type||'text',placeholder:opts.placeholder||'',value:opts.value||'',danger:!!opts.danger})
  };
})();
