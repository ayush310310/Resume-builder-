function msg(t,ok=false){const e=document.getElementById("msg");e.className=ok?"msg-success":"msg-error";e.textContent=t}
const reg=document.getElementById("registerForm");
if(reg)reg.addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(reg));try{const r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});const j=await r.json();if(!r.ok)throw Error(j.error);msg(j.message,true);setTimeout(()=>location.href="/login.html",700)}catch(x){msg(x.message)}});
const login=document.getElementById("loginForm");
if(login)login.addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(login));try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});const j=await r.json();if(!r.ok)throw Error(j.error);location.href="/dashboard.html"}catch(x){msg(x.message)}});
