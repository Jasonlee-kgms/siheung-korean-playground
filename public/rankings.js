const rankings = (() => {
  const localMode = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const localKey = 'siheung_rankings';
  const queueKey = 'siheung_score_queue';
  const endpoint = '/.netlify/functions/scores';
  const formatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
  const nicknamePattern = /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,7}$/u;
  let flushing = false;
  const sending = new Map();

  function read(key) {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  }

  async function request(method, record) {
    const response = await fetch(endpoint, {
      method,
      cache: 'no-store',
      headers: record ? { 'Content-Type': 'application/json' } : undefined,
      body: record ? JSON.stringify(record) : undefined,
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true || !Array.isArray(result.records)) {
      const error = new Error('점수 연동에 실패했습니다.');
      error.code = result?.error;
      throw error;
    }
    return result.records;
  }

  function putInQueue(record) {
    const queue = read(queueKey);
    if (!queue.some(entry => entry.id === record.id)) {
      localStorage.setItem(queueKey, JSON.stringify([...queue, record]));
    }
  }

  function removeFromQueue(id) {
    localStorage.setItem(queueKey, JSON.stringify(read(queueKey).filter(entry => entry.id !== id)));
  }

  function send(record) {
    if (sending.has(record.id)) return sending.get(record.id);
    const pending = request('POST', record).then(records => {
      removeFromQueue(record.id);
      return records;
    }).catch(error => {
      if (['invalid_record', 'id_conflict'].includes(error.code)) removeFromQueue(record.id);
      throw error;
    }).finally(() => sending.delete(record.id));
    sending.set(record.id, pending);
    return pending;
  }

  async function retryPending() {
    if (localMode || flushing || !navigator.onLine) return;
    flushing = true;
    try {
      for (const record of read(queueKey)) {
        try {
          await send(record);
        } catch (error) {
          if (!['invalid_record', 'id_conflict'].includes(error.code)) break;
        }
      }
    } catch {
      // 저장소를 사용할 수 없으면 화면에서 다시 등록할 수 있다.
    } finally {
      flushing = false;
    }
  }

  return {
    localMode,
    validNickname: nickname => nicknamePattern.test(nickname),
    formatDate: value => /^\d{4}-\d{2}-\d{2}T/.test(value || '') && Number.isFinite(Date.parse(value))
      ? formatter.format(new Date(value)) : value || '',
    list: async () => localMode ? read(localKey).slice(0, 10) : request('GET'),
    save: async record => {
      if (!localMode) {
        putInQueue(record);
        return send(record);
      }
      const entries = read(localKey);
      if (!entries.some(entry => entry.id === record.id)) {
        entries.push({ ...record, date: new Date().toISOString() });
        entries.sort((a, b) => b.score - a.score);
        localStorage.setItem(localKey, JSON.stringify(entries.slice(0, 30)));
      }
      return entries.slice(0, 10);
    },
    startRetry: () => {
      if (localMode) return;
      retryPending();
      window.addEventListener('online', retryPending);
      setInterval(retryPending, 20000);
    }
  };
})();
