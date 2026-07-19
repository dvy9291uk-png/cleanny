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

