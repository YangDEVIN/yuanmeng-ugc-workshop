'use strict';
const search=document.querySelector('#search'),category=document.querySelector('#category'),cards=[...document.querySelectorAll('article')];
function filter(){const q=search.value.trim().toLocaleLowerCase();let n=0;for(const card of cards){card.hidden=!!((category.value&&card.dataset.category!==category.value)||(q&&!card.textContent.toLocaleLowerCase().includes(q)));if(!card.hidden)n++;}document.querySelector('#count').textContent='显示 '+n+' / '+cards.length+' 类问题';document.querySelector('#empty').hidden=n!==0;}
search.addEventListener('input',filter);category.addEventListener('change',filter);filter();
