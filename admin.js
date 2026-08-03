import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

initializeApp({apiKey:"AIzaSyD_I1HSrulXlPCj9_U_FhSfsYQhz-DxbMk",authDomain:"dbplu-62d92.firebaseapp.com",projectId:"dbplu-62d92"});
const db=getFirestore();
const currentUser=JSON.parse(localStorage.getItem("user")||"null");
const currentRole=String(currentUser?.role||"").toUpperCase();
if(!["ADMIN","SUPERADMIN"].includes(currentRole)){location.href="index.html";throw new Error("Akses ditolak");}

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let users=[],stores=[],products=[],resetRequests=[],editingStoreId=null,userModal,productModal;

onSnapshot(collection(db,"stores"),snap=>{
  stores=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.storeid||a.id).localeCompare(String(b.storeid||b.id)));
  renderStores(); fillStoreOptions(); const el=document.getElementById("summaryStores"); if(el) el.textContent=stores.length;
},e=>$("storeList").innerHTML=`<div class="alert alert-danger">${esc(e.message)}</div>`);

onSnapshot(collection(db,"users"),snap=>{
  users=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.username||"").localeCompare(String(b.username||"")));
  $("pendingBadge").innerText=users.filter(x=>x.active!==true).length;
  const su=document.getElementById("summaryUsers"),sa=document.getElementById("summaryActive"),sp=document.getElementById("summaryPending"); if(su)su.textContent=users.length;if(sa)sa.textContent=users.filter(x=>x.active===true).length;if(sp)sp.textContent=users.filter(x=>x.active!==true).length;
  renderUsers();
},e=>$("userList").innerHTML=`<div class="alert alert-danger">${esc(e.message)}</div>`);

window.renderUsers=()=>{
  const q=$("userSearch").value.toLowerCase().trim(); const status=$("userStatus").value;
  const rows=users.filter(x=>{
    const text=`${x.id} ${x.userid||""} ${x.username||""} ${x.storeid||""} ${x.storename||""}`.toLowerCase();
    if(q&&!text.includes(q))return false;
    if(status==="PENDING"&&x.active===true)return false;
    if(status==="ACTIVE"&&x.active!==true)return false;
    if(status==="INACTIVE"&&x.active===true)return false;
    return true;
  });
  $("userList").innerHTML=rows.length?rows.map(x=>`
  <div class="card shadow-sm mb-2"><div class="card-body py-2">
    <div class="d-flex justify-content-between align-items-start gap-2">
      <div><b>${esc(x.username||"-")}</b><div class="label">NIK ${esc(x.userid||x.id)} • ${esc(x.storeid||"-")} - ${esc(x.storename||"-")}</div></div>
      <div class="text-end"><span class="badge ${x.active===true?'bg-success':'bg-warning text-dark'}">${x.active===true?'AKTIF':'MENUNGGU'}</span> <span class="badge bg-secondary">${esc(String(x.role||'USER').toUpperCase())}</span></div>
    </div>
    <button class="btn btn-sm btn-outline-primary mt-2" onclick="openUser('${esc(x.id)}')">Kelola</button>
    ${x.active!==true?`<button class="btn btn-sm btn-success mt-2" onclick="quickActivate('${esc(x.id)}')">Aktifkan</button>`:''}
  </div></div>`).join(""):`<div class="alert alert-light text-center">Tidak ada akun.</div>`;
};

window.quickActivate=async id=>{
  if(!confirm("Aktifkan akun ini?"))return;
  await updateDoc(doc(db,"users",id),{active:true,updatedAt:serverTimestamp(),updatedBy:currentUser.userid});
};

window.openUser=id=>{
  const x=users.find(v=>v.id===id); if(!x)return;
  $("editNik").value=id; $("editNikView").value=x.userid||id; $("editName").value=x.username||"";
  fillStoreOptions(x.storeid); $("editRole").value=String(x.role||"USER").toUpperCase();
  $("editActive").value=x.active===true?"true":"false"; $("editPassword").value=""; $("userMsg").textContent="";
  userModal=userModal||new bootstrap.Modal($("userModal")); userModal.show();
};

function fillStoreOptions(selected){
  const el=$("editStore"); if(!el)return;
  el.innerHTML=stores.map(s=>{const id=String(s.storeid||s.id).toUpperCase();return `<option value="${esc(id)}" ${id===selected?'selected':''}>${esc(id)} - ${esc(s.storename||id)}</option>`}).join("");
}

window.saveUser=async()=>{
  try{
    const id=$("editNik").value; const storeid=$("editStore").value; const store=stores.find(s=>String(s.storeid||s.id).toUpperCase()===storeid);
    if(!id||!store)throw new Error("Data user atau toko tidak valid");
    const role=$("editRole").value;
    if(id===String(currentUser.userid)&&$("editActive").value!=="true")throw new Error("Admin tidak boleh menonaktifkan akunnya sendiri");
    if(id===String(currentUser.userid)&&role!==currentRole)throw new Error("Admin tidak boleh mengubah role akun sendiri");
    const payload={username:$("editName").value.trim().toUpperCase(),storeid,storename:store.storename||storeid,role,active:$("editActive").value==="true",updatedAt:serverTimestamp(),updatedBy:currentUser.userid};
    const pw=$("editPassword").value; if(pw){if(pw.length<6)throw new Error("Password minimal 6 karakter");payload.password=pw;}
    await updateDoc(doc(db,"users",id),payload); $("userMsg").textContent="Berhasil disimpan"; $("userMsg").className="msg mt-2 text-success"; setTimeout(()=>userModal.hide(),700);
  }catch(e){$("userMsg").textContent=e.message;$("userMsg").className="msg mt-2 text-danger";}
};

window.renderStores=()=>{
  const q=$("storeSearch").value.toLowerCase().trim();
  const rows=stores.filter(s=>`${s.storeid||s.id} ${s.storename||""}`.toLowerCase().includes(q));
  $("storeList").innerHTML=rows.length?rows.map(s=>{
    const id=String(s.storeid||s.id).toUpperCase(); return `<div class="card shadow-sm mb-2"><div class="card-body py-2 d-flex justify-content-between align-items-center gap-2">
    <div><b>${esc(id)} - ${esc(s.storename||id)}</b><div class="label">Status: ${s.active===false?'Nonaktif':'Aktif'}</div></div>
    <button class="btn btn-sm btn-outline-primary" onclick="editStore('${esc(id)}')">Edit</button></div></div>`;
  }).join(""):`<div class="alert alert-light text-center">Belum ada toko.</div>`;
};

window.editStore=id=>{
  const s=stores.find(x=>String(x.storeid||x.id).toUpperCase()===id); if(!s)return;
  editingStoreId=id; $("storeid").value=id; $("storeid").readOnly=true; $("storename").value=s.storename||""; $("storeActive").value=s.active===false?"false":"true";
  $("storeFormTitle").textContent="Edit Toko"; $("saveStoreBtn").textContent="Perbarui";
};

window.saveStore=async()=>{
  const msg=$("storeMsg"); msg.textContent="";
  try{
    const storeid=$("storeid").value.trim().toUpperCase().replace(/\s+/g,""); const storename=$("storename").value.trim().toUpperCase();
    if(!storeid||!storename)throw new Error("Kode dan nama toko wajib diisi");
    if(!/^[A-Z0-9_-]{2,15}$/.test(storeid))throw new Error("Format kode toko tidak valid");
    const ref=doc(db,"stores",storeid); const existing=await getDoc(ref);
    if(!editingStoreId&&existing.exists())throw new Error("Kode toko sudah terdaftar");
    const fonnteToken=$("fonnteToken").value.trim();
    if($("waActive").value==="true"&&!fonnteToken)throw new Error("Token Fonnte wajib diisi jika notifikasi WA aktif");
    await setDoc(ref,{storeid,storename,active:$("storeActive").value==="true",waActive:$("waActive").value==="true",fonnteToken,updatedAt:serverTimestamp(),updatedBy:currentUser.userid,...(!existing.exists()?{createdAt:serverTimestamp(),createdBy:currentUser.userid}:{})},{merge:true});
    msg.textContent="Toko berhasil disimpan";msg.className="msg mt-2 text-success";resetStoreForm();
  }catch(e){msg.textContent=e.message;msg.className="msg mt-2 text-danger";}
};

function resetStoreForm(){editingStoreId=null;$("storeid").value="";$("storeid").readOnly=false;$("storename").value="";$("storeActive").value="true";$("waActive").value="true";$("fonnteToken").value="";$("fonnteToken").type="password";$("storeFormTitle").textContent="Daftarkan Toko";$("saveStoreBtn").textContent="Simpan";}
window.toggleToken=()=>{const input=$("fonnteToken"),icon=$("tokenEye");input.type=input.type==="password"?"text":"password";icon.className=input.type==="password"?"bi bi-eye":"bi bi-eye-slash";};


onSnapshot(collection(db,"datasumber"),snap=>{products=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.DESKRIPSI||"").localeCompare(String(b.DESKRIPSI||"")));renderProducts();});
onSnapshot(collection(db,"passwordResetRequests"),snap=>{resetRequests=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==="PENDING");$("resetBadge").textContent=resetRequests.length;renderResetRequests();});

window.renderProducts=()=>{const q=String($("productSearch")?.value||"").toLowerCase();const rows=products.filter(x=>`${x.BARCODE||""} ${x.DESKRIPSI||""}`.toLowerCase().includes(q)).slice(0,100);$("productList").innerHTML=rows.length?rows.map(x=>`<div class="card shadow-sm mb-2"><div class="card-body py-2 d-flex justify-content-between align-items-center"><div><b>${esc(x.DESKRIPSI||'-')}</b><div class="label">${esc(x.BARCODE||'-')} • RH: ${Number(x.RH)||0} hari</div></div><button class="btn btn-sm btn-outline-primary" onclick="openProduct('${esc(x.id)}')"><i class="bi bi-pencil"></i> Edit</button></div></div>`).join(""):`<div class="alert alert-light text-center">Produk tidak ditemukan.</div>`;};
window.openProduct=id=>{const x=products.find(v=>v.id===id);if(!x)return;$("editProductId").value=id;$("editProductName").value=x.DESKRIPSI||"";$("editProductBarcode").value=x.BARCODE||"";$("editProductRh").value=Number(x.RH)||0;$("productMsg").textContent="";productModal=productModal||new bootstrap.Modal($("productModal"));productModal.show();};
window.saveProductRh=async()=>{try{const id=$("editProductId").value;const rh=Number($("editProductRh").value);if(!Number.isInteger(rh)||rh<0||rh>3650)throw new Error("RH harus angka 0–3650 hari");await updateDoc(doc(db,"datasumber",id),{RH:rh,updatedAt:serverTimestamp(),updatedBy:currentUser.userid});$("productMsg").textContent="RH berhasil diperbarui";$("productMsg").className="msg mt-2 text-success";setTimeout(()=>productModal.hide(),600);}catch(e){$("productMsg").textContent=e.message;$("productMsg").className="msg mt-2 text-danger";}};
window.renderResetRequests=()=>{$("resetList").innerHTML=resetRequests.length?resetRequests.map(x=>`<div class="card shadow-sm mb-2"><div class="card-body py-2"><b>${esc(x.username||'-')}</b><div class="label">NIK ${esc(x.nik||x.id)} • ${esc(x.storeid||'-')}</div><button class="btn btn-sm btn-primary mt-2" onclick="processReset('${esc(x.id)}')">Buat password sementara</button></div></div>`).join(""):`<div class="alert alert-light text-center">Tidak ada permintaan reset.</div>`;};
window.processReset=async id=>{const r=resetRequests.find(x=>x.id===id);if(!r)return;if(currentRole!=="SUPERADMIN"&&String(r.storeid)!==String(currentUser.storeid))return alert("Hanya admin toko terkait yang boleh memproses");const pw=prompt("Masukkan password sementara minimal 6 karakter");if(!pw)return;if(pw.length<6)return alert("Minimal 6 karakter");await updateDoc(doc(db,"users",r.nik||id),{password:pw,updatedAt:serverTimestamp(),updatedBy:currentUser.userid});await updateDoc(doc(db,"passwordResetRequests",id),{status:"RESOLVED",resolvedAt:serverTimestamp(),resolvedBy:currentUser.userid});alert("Password sementara berhasil dibuat. Sampaikan langsung kepada user.");};
