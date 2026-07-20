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
// scroll reveal — with full fallbacks so content can never stay hidden
const reveal = el => el.classList.add('in');
const all = document.querySelectorAll('.rv');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  all.forEach(el => io.observe(el));
} else {
  all.forEach(reveal);
}
// safety net: whatever happens, everything is visible after 1.8s
setTimeout(() => all.forEach(reveal), 1800);
