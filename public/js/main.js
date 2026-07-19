// category filter chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    const cat = chip.dataset.cat;
    document.querySelectorAll('#svcGrid .svc-card').forEach(card => {
      card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
    });
  });
});
// hourly estimate
const hoursSel = document.getElementById('hoursSel');
if (hoursSel) {
  const rate = parseFloat(hoursSel.dataset.rate);
  const out = document.getElementById('estVal');
  hoursSel.addEventListener('change', () => { out.textContent = '£' + (rate * parseInt(hoursSel.value, 10)); });
}
// scroll reveal
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
