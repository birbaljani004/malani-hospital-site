// मोबाइल मेन्यू टॉगल
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// अपॉइंटमेंट फॉर्म सबमिट हैंडलर
function handleAppt(e) {
  e.preventDefault();
  var successBox = document.getElementById('appt-success');
  if (successBox) successBox.style.display = 'block';
  e.target.reset();
  if (successBox) successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// अगर सीधे इस पेज पर आए हैं (history नहीं है) तो "पीछे" बटन को होम पर भेजें
function goBackOrHome() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = 'index.html';
  }
}
