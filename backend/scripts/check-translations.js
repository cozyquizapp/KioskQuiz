const API_BASE = 'https://cozyquiz-backend.onrender.com/api';

fetch(`${API_BASE}/questions`)
  .then(r => r.json())
  .then(data => {
    const qs = data.questions || data;
    console.log('Total:', qs.length);

    const missing = qs.filter(q => {
      const noQEn = !q.questionEn;
      const noOptEn = Array.isArray(q.options) && q.options.length > 0 && !q.optionsEn;
      const noAnsEn = q.answer && !q.answerEn;
      const noOrderEn = Array.isArray(q.correctOrder) && q.correctOrder.length > 0 && !q.correctOrderEn;
      return noQEn || noOptEn || noAnsEn || noOrderEn;
    });

    console.log('Missing any EN field:', missing.length);
    missing.forEach(q => {
      const flags = [];
      if (!q.questionEn) flags.push('questionEn');
      if (Array.isArray(q.options) && q.options.length > 0 && !q.optionsEn) flags.push('optionsEn');
      if (q.answer && !q.answerEn) flags.push('answerEn');
      if (Array.isArray(q.correctOrder) && q.correctOrder.length > 0 && !q.correctOrderEn) flags.push('correctOrderEn');
      console.log(` [${q.mechanic}] ${q.id}: missing ${flags.join(', ')}`);
    });
  });
