const submit = document.getElementById('submit'),
      keyBtn = document.getElementById('keyBtn'),
      overlay = document.getElementById('overlay'),
      modal = document.getElementById('modal'),
      pw4 = document.getElementById('pw4');

const usbCells = [...document.querySelectorAll('#usbCells .cell')];
const pwCells = [...document.querySelectorAll('#pwCells .cell')];
const allCells = [...usbCells, ...pwCells];

const closeBtn = document.getElementById('closeBtn');

let done = false;
let cleared = false;
let rec = null;
let listening = false;
let checking = false;

// ===========================================================
// 文字の正規化
// 大文字・小文字・全角・半角を区別しない
// ===========================================================

const norm = s =>
  s.normalize('NFKC').trim().toLowerCase();

const active = g =>
  g.filter(c => !c.classList.contains('gone'));

const valueOf = g =>
  active(g).map(c => c.value).join('');

// ===========================================================
// 送信ボタンの状態更新
// ===========================================================

function update() {

  submit.disabled =
    done ||
    allCells.some(
      c =>
        !c.classList.contains('gone') &&
        c.value === ''
    );

}

// ===========================================================
// 入力ボックスの処理
// ===========================================================

allCells.forEach(cell => {

  const group =
    usbCells.includes(cell) ? usbCells : pwCells;

  cell.addEventListener('input', e => {

    if (e.isComposing) return;

    fill(cell, group);

  });

  cell.addEventListener('compositionend', () => {

    fill(cell, group);

  });

  cell.addEventListener('keydown', e => {

    const list = active(group);
    const i = list.indexOf(cell);

    if (
      e.key === 'Backspace' &&
      cell.value === '' &&
      i > 0
    ) {

      list[i - 1].value = '';
      list[i - 1].focus();

      update();
      e.preventDefault();

    }

    else if (
      e.key === 'ArrowLeft' &&
      i > 0
    ) {

      list[i - 1].focus();

    }

    else if (
      e.key === 'ArrowRight' &&
      i < list.length - 1
    ) {

      list[i + 1].focus();

    }

  });

  cell.addEventListener('focus', () => {

    cell.select();

  });

});

// ===========================================================
// 入力文字を1文字ずつ振り分ける
// 全角入力・貼り付け対応
// ===========================================================

function fill(cell, group) {

  const chars = [
    ...cell.value.normalize('NFKC')
  ].filter(ch => ch.trim() !== '');

  const list = active(group);

  let i = list.indexOf(cell);

  cell.value = '';

  for (const ch of chars) {

    if (i >= list.length) break;

    list[i].value = ch;

    i++;

  }

  const next = list[
    Math.min(i, list.length - 1)
  ];

  if (next) next.focus();

  update();

}

// ===========================================================
// 鍵ボタンの操作
// 押している間だけ音声認識
// ===========================================================

keyBtn.style.touchAction = 'none';

keyBtn.addEventListener('contextmenu', e => {

  e.preventDefault();

});

keyBtn.addEventListener('pointerdown', e => {

  if (done) return;

  try {

    keyBtn.setPointerCapture(e.pointerId);

  } catch (_) {}

  startListening();

});

[
  'pointerup',
  'pointercancel',
  'lostpointercapture'
].forEach(type => {

  keyBtn.addEventListener(type, stopListening);

});

// ===========================================================
// キーボード操作
// Space / Enter
// ===========================================================

keyBtn.addEventListener('keydown', e => {

  if (
    (e.key === ' ' || e.key === 'Enter') &&
    !e.repeat
  ) {

    e.preventDefault();

    if (!done) startListening();

  }

});

keyBtn.addEventListener('keyup', e => {

  if (
    e.key === ' ' ||
    e.key === 'Enter'
  ) {

    e.preventDefault();

    stopListening();

  }

});

// ===========================================================
// 音声認識
// ===========================================================

const SR =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

const toHira = s =>
  s.replace(
    /[\u30A1-\u30F6]/g,
    c => String.fromCharCode(
      c.charCodeAt(0) - 0x60
    )
  );

const isUSB = t => {

  const n = toHira(
    t.normalize('NFKC').toLowerCase()
  ).replace(
    /[\s、。,.\-ー]/g,
    ''
  );

  return /usb|ゆうえすび|ゆえすび/.test(n);

};

// ===========================================================
// 音声認識開始
// ===========================================================

function startListening() {

  if (
    !SR ||
    listening ||
    done ||
    cleared
  ) return;

  try {

    rec = new SR();

    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = e => {

      for (
        let i = e.resultIndex;
        i < e.results.length;
        i++
      ) {

        if (
          isUSB(
            e.results[i][0].transcript
          )
        ) {

          clearBoxes();
          return;

        }

      }

    };

    rec.onend = () => {

      if (
        listening &&
        !cleared &&
        !done
      ) {

        try {

          rec.start();

        } catch (_) {}

      }

    };

    rec.onerror = e => {

      if (
        e.error === 'not-allowed' ||
        e.error === 'service-not-allowed'
      ) {

        listening = false;

        console.warn(
          'マイクが許可されていません'
        );

      }

    };

    listening = true;

    rec.start();

  } catch (err) {

    listening = false;

    console.warn(err);

  }

}

// ===========================================================
// 音声認識停止
// ===========================================================

function stopListening() {

  listening = false;

  if (rec) {

    try {

      rec.stop();

    } catch (_) {}

  }

}

// ===========================================================
// USBと発声したときの処理
// パスワード4番目のボックスを消す
// ===========================================================

function clearBoxes() {

  cleared = true;

  stopListening();

  pw4.value = '';

  pw4.classList.add('gone');

  update();

}

// ===========================================================
// 鍵画像が読み込めない場合
// ===========================================================

document.getElementById('keyImg')
  .addEventListener('error', function () {

    this.style.display = 'none';

    document.getElementById(
      'keyFallback'
    ).style.display = 'block';

  });

// ===========================================================
// 送信ボタン
// ===========================================================

submit.addEventListener('click', () => {

  if (submit.disabled) return;

  done = true;
  checking = true;

  stopListening();

  // 入力操作を無効化
  [
    ...allCells,
    submit,
    keyBtn
  ].forEach(e => {

    e.disabled = true;

  });

  // =========================================================
  // 正解判定
  // 大文字・小文字・全角・半角に対応
  // =========================================================

  const ok =
    norm(valueOf(usbCells)) === norm('6') &&
    norm(valueOf(pwCells)) === norm('LEG');

  // =========================================================
  // 3秒間の認証演出
  // =========================================================

  modal.className = 'modal checking';

  document.getElementById(
    'mTitle'
  ).textContent = '認証中...';

  document.getElementById(
    'mText'
  ).textContent = 'パスワードを照合しています...';

  // 閉じるボタンを無効化
  closeBtn.disabled = true;
  closeBtn.style.display = 'none';

  // 認証画面を表示
  overlay.classList.add('show');

  // =========================================================
  // 3秒後に結果表示
  // =========================================================

  setTimeout(() => {

    checking = false;

    modal.className =
      'modal ' + (ok ? 'ok' : 'ng');

    document.getElementById(
      'mTitle'
    ).textContent =
      ok ? '認証成功！' : '認証失敗';

    document.getElementById(
      'mText'
    ).textContent =
      ok
        ? 'おめでとうございます！'
        : '残念ながら不正解です。';

    // 閉じるボタンを表示
    closeBtn.disabled = false;
    closeBtn.style.display = '';

  }, 3000);

});

// ===========================================================
// 結果画面を閉じる
// ===========================================================

closeBtn.addEventListener('click', () => {

  if (checking) return;

  overlay.classList.remove('show');

});

// ===========================================================
// 初期状態
// ===========================================================

update();