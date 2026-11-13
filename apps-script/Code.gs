const SCORE_TAB = '국어놀이터 점수';
const SCORE_COLUMNS = ['제출 ID', '별명', '점수', '난이도', '등록 시각'];

function setupScores() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('구글 시트의 확장 프로그램 메뉴에서 Apps Script를 열어 주세요.');

  const sheet = spreadsheet.getSheetByName(SCORE_TAB) || spreadsheet.insertSheet(SCORE_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, SCORE_COLUMNS.length).setValues([SCORE_COLUMNS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('A:B').setNumberFormat('@');
    sheet.getRange('E:E').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }

  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('SCORE_SPREADSHEET_ID', spreadsheet.getId());
  if (!properties.getProperty('SCORE_SYNC_TOKEN')) {
    properties.setProperty('SCORE_SYNC_TOKEN', Utilities.getUuid() + Utilities.getUuid());
  }
}

function doPost(event) {
  let payload;
  try {
    payload = JSON.parse(event.postData.contents);
  } catch (error) {
    return scoreResponse({ ok: false, error: 'invalid_record' });
  }

  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty('SCORE_SYNC_TOKEN');
  const spreadsheetId = properties.getProperty('SCORE_SPREADSHEET_ID');
  if (!token || !spreadsheetId) return scoreResponse({ ok: false, error: 'not_configured' });
  if (payload?.token !== token) return scoreResponse({ ok: false, error: 'not_authorized' });
  if (!['list', 'save'].includes(payload.action)) {
    return scoreResponse({ ok: false, error: 'invalid_record' });
  }

  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(SCORE_TAB);
  if (!sheet) return scoreResponse({ ok: false, error: 'not_configured' });
  if (payload.action === 'list') {
    return scoreResponse({ ok: true, records: topScores(readScores(sheet)) });
  }

  const record = cleanScore(payload.record);
  if (!record) return scoreResponse({ ok: false, error: 'invalid_record' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return scoreResponse({ ok: false, error: 'busy' });
  try {
    const rows = readScores(sheet);
    const existing = rows.find(([id]) => id === record.id);
    if (existing) {
      const [, nickname, score, mode] = existing;
      if (nickname !== record.nickname || score !== record.score || mode !== record.mode) {
        return scoreResponse({ ok: false, error: 'id_conflict' });
      }
    } else {
      const row = [record.id, record.nickname, record.score, record.mode, new Date()];
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, SCORE_COLUMNS.length).setValues([row]);
      SpreadsheetApp.flush();
      rows.push(row);
    }
    return scoreResponse({ ok: true, records: topScores(rows) });
  } finally {
    lock.releaseLock();
  }
}

function cleanScore(record) {
  if (typeof record?.id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(record.id)) return null;
  if (typeof record.nickname !== 'string') return null;
  const nickname = record.nickname.trim().normalize('NFC');
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]{0,7}$/u.test(nickname)) return null;
  if (!Number.isInteger(record.score) || record.score < 0 || record.score > 1890 || record.score % 10 !== 0) return null;
  if (!['초등', '중등'].includes(record.mode)) return null;
  return { id: record.id, nickname, score: record.score, mode: record.mode };
}

function readScores(sheet) {
  const count = sheet.getLastRow() - 1;
  return count > 0 ? sheet.getRange(2, 1, count, SCORE_COLUMNS.length).getValues() : [];
}

function topScores(rows) {
  return rows
    .filter(([, nickname, score, mode, date]) => typeof nickname === 'string' && nickname
      && Number.isInteger(score) && ['초등', '중등'].includes(mode)
      && date instanceof Date && Number.isFinite(date.getTime()))
    .sort((left, right) => right[2] - left[2] || left[4] - right[4])
    .slice(0, 10)
    .map(([id, nickname, score, mode, date]) => ({ id, nickname, score, mode, date: date.toISOString() }));
}

function scoreResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
