// Asteroids Mini — komplett offline im Browser spielbar

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const W = canvas.width, H = canvas.height;
const TAU = Math.PI * 2;

const keys = new Set();
addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyR") reset();
});
addEventListener("keyup", (e) => keys.delete(e.code));

function rand(min, max){ return Math.random() * (max - min) + min; }
function wrapPos(p){
  if (p.x < 0) p.x += W;
  if (p.x >= W) p.x -= W;
  if (p.y < 0) p.y += H;
  if (p.y >= H) p.y -= H;
}
function dist2(a,b){
  const dx = a.x-b.x, dy = a.y-b.y;
  return dx*dx + dy*dy;
}

let ship, bullets, asteroids, score, lives, gameOver, lastShot;

function reset(){
  ship = {
    x: W/2, y: H/2,
    vx: 0, vy: 0,
    a: -Math.PI/2,
    r: 14
  };
  bullets = [];
  asteroids = [];
  score = 0;
  lives = 3;
  gameOver = false;
  lastShot = 0;

  // Start-Asteroiden
  for (let i=0;i<6;i++) spawnAsteroid(3);
}

function spawnAsteroid(size, x, y){
  // size: 3 groß, 2 mittel, 1 klein
  const r = size === 3 ? 46 : size === 2 ? 28 : 16;

  const ax = x ?? (Math.random() < 0.5 ? rand(0, W*0.25) : rand(W*0.75, W));
  const ay = y ?? (Math.random() < 0.5 ? rand(0, H*0.25) : rand(H*0.75, H));

  const speed = size === 3 ? rand(0.6, 1.2) : size === 2 ? rand(0.9, 1.8) : rand(1.2, 2.4);
  const ang = rand(0, TAU);

  // etwas "eckige" Form
  const verts = [];
  const n = Math.floor(rand(8, 13));
  for (let i=0;i<n;i++){
    const t = (i/n)*TAU;
    verts.push({
      t,
      k: rand(0.75, 1.25)
    });
  }

  asteroids.push({
    x: ax, y: ay,
    vx: Math.cos(ang)*speed,
    vy: Math.sin(ang)*speed,
    r,
    size,
    verts
  });
}

function shoot(){
  const now = performance.now();
  if (now - lastShot < 180) return; // Feuerrate
  lastShot = now;

  const speed = 6.2;
  bullets.push({
    x: ship.x + Math.cos(ship.a)*ship.r,
    y: ship.y + Math.sin(ship.a)*ship.r,
    vx: ship.vx + Math.cos(ship.a)*speed,
    vy: ship.vy + Math.sin(ship.a)*speed,
    life: 70
  });
}

function explodeAsteroid(idx){
  const a = asteroids[idx];
  asteroids.splice(idx, 1);
  score += a.size * 10;

  if (a.size > 1){
    // 2 Splitter
    for (let i=0;i<2;i++){
      spawnAsteroid(a.size - 1, a.x + rand(-8,8), a.y + rand(-8,8));
    }
  }
}

function shipHit(){
  lives -= 1;
  // Reset Position + etwas Pause/Schutz
  ship.x = W/2; ship.y = H/2;
  ship.vx = 0; ship.vy = 0;
  ship.a = -Math.PI/2;
  ship.inv = 120; // i-frames
  if (lives <= 0){
    gameOver = true;
  }
}

function update(){
  if (gameOver) return;

  // Steuerung
  if (keys.has("ArrowLeft")) ship.a -= 0.06;
  if (keys.has("ArrowRight")) ship.a += 0.06;
  if (keys.has("ArrowUp")){
    ship.vx += Math.cos(ship.a)*0.12;
    ship.vy += Math.sin(ship.a)*0.12;
  }
  // Reibung
  ship.vx *= 0.99;
  ship.vy *= 0.99;

  if (keys.has("Space")) shoot();

  ship.x += ship.vx;
  ship.y += ship.vy;
  wrapPos(ship);

  if (ship.inv) ship.inv--;

  // Bullets
  for (let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    wrapPos(b);
    b.life--;
    if (b.life <= 0) bullets.splice(i,1);
  }

  // Asteroids
  for (const a of asteroids){
    a.x += a.vx;
    a.y += a.vy;
    wrapPos(a);
  }

  // Bullet vs Asteroid
  for (let i=asteroids.length-1;i>=0;i--){
    const a = asteroids[i];
    for (let j=bullets.length-1;j>=0;j--){
      const b = bullets[j];
      if (dist2(a,b) < a.r*a.r){
        bullets.splice(j,1);
        explodeAsteroid(i);
        break;
      }
    }
  }

  // Ship vs Asteroid
  if (!ship.inv){
    for (const a of asteroids){
      const rr = (a.r + ship.r) * (a.r + ship.r);
      if (dist2(a, ship) < rr){
        shipHit();
        break;
      }
    }
  }

  // Wenn alle Asteroiden weg: neue Runde
  if (asteroids.length === 0){
    for (let i=0;i<7;i++) spawnAsteroid(3);
  }
}

function drawShip(){
  const blink = ship.inv && (Math.floor(ship.inv/8) % 2 === 0);
  if (blink) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.a);

  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, 10);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.stroke();

  // Flamme bei Schub
  if (keys.has("ArrowUp")){
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-20, 6);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-20, -6);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function drawAsteroid(a){
  ctx.save();
  ctx.translate(a.x, a.y);

  ctx.beginPath();
  for (let i=0;i<a.verts.length;i++){
    const v = a.verts[i];
    const rr = a.r * v.k;
    const x = Math.cos(v.t) * rr;
    const y = Math.sin(v.t) * rr;
    if (i === 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

function render(){
  ctx.clearRect(0,0,W,H);

  // UI
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";

  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText(`Score: ${score}`, 14, 22);
  ctx.fillText(`Lives: ${lives}`, 14, 44);

  // Bullets
  for (const b of bullets){
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.2, 0, TAU);
    ctx.fill();
  }

  // Asteroids
  for (const a of asteroids) drawAsteroid(a);

  // Ship
  drawShip();

  if (gameOver){
    ctx.font = "44px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", W/2, H/2 - 10);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("Drücke R für Neustart", W/2, H/2 + 26);
    ctx.textAlign = "left";
  }
}

function loop(){
  update();
  render();
  requestAnimationFrame(loop);
}

reset();
loop();