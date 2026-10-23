/* =====================================================
   SPLASH BLOCKS
===================================================== */

const falling =
document.getElementById("fallingBlocks");

const splashColors=[
    "#84cc16",
    "#a3e635",
    "#bef264",
    "#65a30d",
    "#d9f99d"
];

for(let i=0;i<35;i++){

    const b=
    document.createElement("div");

    b.className="fBlock";

    b.style.left=
    Math.random()*100+"%";

    b.style.animationDuration=
    (2+Math.random()*4)+"s";

    b.style.animationDelay=
    (-Math.random()*5)+"s";

    const size=
    10+Math.random()*18;

    b.style.width=size+"px";
    b.style.height=size+"px";

    b.style.background=
    splashColors[
        Math.floor(
            Math.random()*splashColors.length
        )
    ];

    falling.appendChild(b);
}


/* =====================================================
   SOUND
===================================================== */

let audio=null;

function audioStart(){

    if(!audio){

        audio=
        new(
            window.AudioContext||
            window.webkitAudioContext
        )();
    }

    if(audio.state==="suspended")
        audio.resume();
}

function beep(freq,d=.08,v=.35){

    audioStart();

    const o=
    audio.createOscillator();

    const g=
    audio.createGain();

    o.type="square";
    o.frequency.value=freq;

    g.gain.value=v;

    g.gain.exponentialRampToValueAtTime(
        .001,
        audio.currentTime+d
    );

    o.connect(g);
    g.connect(audio.destination);

    o.start();

    o.stop(
        audio.currentTime+d
    );
}


/* =====================================================
   SPLASH TO MENU
===================================================== */

setTimeout(()=>{

    document.getElementById(
        "splash"
    ).classList.add("hide");

    document.getElementById(
        "startMenu"
    ).style.display="flex";

},3000);


/* =====================================================
   GAME
===================================================== */

const canvas=
document.getElementById("board");

const ctx=
canvas.getContext("2d");

const nextCanvas=
document.getElementById("next");

const nextCtx=
nextCanvas.getContext("2d");

const holdCanvas=
document.getElementById("hold");

const holdCtx=
holdCanvas.getContext("2d");

const COLS=10;
const ROWS=20;

const PIECES={

I:{
    color:"#a3e635",
    shape:[[1,1,1,1]]
},

O:{
    color:"#d9f99d",
    shape:[
        [1,1],
        [1,1]
    ]
},

T:{
    color:"#84cc16",
    shape:[
        [0,1,0],
        [1,1,1]
    ]
},

S:{
    color:"#bef264",
    shape:[
        [0,1,1],
        [1,1,0]
    ]
},

Z:{
    color:"#65a30d",
    shape:[
        [1,1,0],
        [0,1,1]
    ]
},

J:{
    color:"#a8c96b",
    shape:[
        [1,0,0],
        [1,1,1]
    ]
},

L:{
    color:"#d0e58a",
    shape:[
        [0,0,1],
        [1,1,1]
    ]
}

};

const TYPES=
Object.keys(PIECES);

let board=[];
let queue=[];
let player=null;
let held=null;

let holdUsed=false;

let score=0;
let lines=0;
let level=1;

let best=
Number(
    localStorage.getItem(
        "retroBlockBest"
    )
)||0;

let started=false;
let paused=false;
let ended=false;

let timer=0;
let last=0;


/* =====================================================
   BOARD
===================================================== */

function resetBoard(){

    board=[];

    for(let y=0;y<ROWS;y++){

        board.push(
            new Array(COLS).fill(null)
        );
    }
}

function randomType(){

    return TYPES[
        Math.floor(
            Math.random()*TYPES.length
        )
    ];
}

function fillQueue(){

    while(queue.length<5)
        queue.push(randomType());
}

function makePiece(type){

    const matrix=
    PIECES[type].shape.map(
        r=>r.slice()
    );

    return{

        type:type,
        matrix:matrix,
        color:PIECES[type].color,

        x:
        Math.floor(
            (COLS-matrix[0].length)/2
        ),

        y:0
    };
}


/* =====================================================
   SPAWN
===================================================== */

function spawn(){

    fillQueue();

    player=
    makePiece(
        queue.shift()
    );

    fillQueue();

    holdUsed=false;

    /*
       IMPORTANT:
       If the new block cannot fit at the top,
       the board has reached the top.
    */

    if(collides(player)){

        ended=true;

        if(score>best){

            best=score;

            localStorage.setItem(
                "retroBlockBest",
                best
            );
        }

        document.getElementById(
            "overlayTitle"
        ).textContent=
        "GAME OVER";

        document.getElementById(
            "overlayText"
        ).textContent=
        "BLOCKS REACHED THE TOP";

        document.querySelector(
            ".overlayBtn"
        ).textContent=
        "↻ RESTART";

        document.getElementById(
            "overlay"
        ).classList.add("show");

        beep(150,.18,.45);

        if(navigator.vibrate){

            navigator.vibrate([
                100,50,100,50,200
            ]);
        }

        update();
    }
}


/* =====================================================
   COLLISION
===================================================== */

function collides(p){

    for(
        let y=0;
        y<p.matrix.length;
        y++
    ){

        for(
            let x=0;
            x<p.matrix[y].length;
            x++
        ){

            if(!p.matrix[y][x])
                continue;

            const px=
            p.x+x;

            const py=
            p.y+y;

            if(
                px<0||
                px>=COLS||
                py>=ROWS
            )
                return true;

            if(
                py>=0 &&
                board[py][px]
            )
                return true;
        }
    }

    return false;
}


/* =====================================================
   MOVE
===================================================== */

function move(dir){

    if(
        !started||
        paused||
        ended
    )
        return;

    player.x+=dir;

    if(collides(player)){

        player.x-=dir;

    }else{

        beep(180,.035,.22);
    }

    draw();
}


/* =====================================================
   ROTATION
===================================================== */

function rotateRight(){
    rotate(1);
}

function rotateLeft(){
    rotate(-1);
}

function rotate(dir){

    if(
        !started||
        paused||
        ended
    )
        return;

    const old=
    player.matrix.map(
        r=>r.slice()
    );

    const oldX=
    player.x;

    let m=
    player.matrix[0].map(
        (_,i)=>
        player.matrix.map(
            r=>r[i]
        )
    );

    if(dir===1){

        m.forEach(
            r=>r.reverse()
        );

    }else{

        m.reverse();
    }

    player.matrix=m;

    for(
        const kick of [0,-1,1,-2,2]
    ){

        player.x=
        oldX+kick;

        if(!collides(player)){

            beep(400,.05,.3);

            draw();

            return;
        }
    }

    player.matrix=old;
    player.x=oldX;
}


/* =====================================================
   DROP
===================================================== */

function softDrop(){

    if(
        !started||
        paused||
        ended
    )
        return;

    player.y++;

    if(collides(player)){

        player.y--;

        lock();

    }else{

        score++;
    }

    timer=0;

    update();
    draw();
}

function hardDrop(){

    if(
        !started||
        paused||
        ended
    )
        return;

    let distance=0;

    while(true){

        player.y++;

        if(collides(player)){

            player.y--;

            break;
        }

        distance++;
    }

    score+=distance*2;

    beep(100,.1,.45);

    if(navigator.vibrate)
        navigator.vibrate(30);

    lock();
}


/* =====================================================
   HOLD
===================================================== */

function holdPiece(){

    if(
        !started||
        paused||
        ended||
        holdUsed
    )
        return;

    const current=
    player.type;

    if(held===null){

        held=current;

        spawn();

    }else{

        const temp=held;

        held=current;

        player=
        makePiece(temp);
    }

    holdUsed=true;

    beep(280,.06,.3);

    setTimeout(
        ()=>beep(520,.07,.25),
        60
    );

    draw();
}


/* =====================================================
   LOCK
===================================================== */

function lock(){

    for(
        let y=0;
        y<player.matrix.length;
        y++
    ){

        for(
            let x=0;
            x<player.matrix[y].length;
            x++
        ){

            if(player.matrix[y][x]){

                const py=
                player.y+y;

                const px=
                player.x+x;

                if(
                    py>=0 &&
                    py<ROWS &&
                    px>=0 &&
                    px<COLS
                ){

                    board[py][px]=
                    player.color;
                }
            }
        }
    }

    clearLines();

    spawn();

    timer=0;

    update();
    draw();
}


/* =====================================================
   CLEAR LINES
===================================================== */

function clearLines(){

    let count=0;

    for(
        let y=ROWS-1;
        y>=0;
        y--
    ){

        if(
            board[y].every(Boolean)
        ){

            board.splice(y,1);

            board.unshift(
                new Array(COLS).fill(null)
            );

            count++;
            y++;
        }
    }

    if(!count)
        return;

    const points=[
        0,
        100,
        300,
        500,
        800
    ];

    score+=
    points[count]*level;

    lines+=count;

    level=
    Math.floor(lines/10)+1;

    popup(
        count===4
        ?"★ TETRIS ★"
        :"+"+count+" LINE"
    );

    beep(500,.07,.35);

    setTimeout(
        ()=>beep(800,.1,.4),
        70
    );

    if(navigator.vibrate)
        navigator.vibrate(50);
}


/* =====================================================
   DRAW BLOCK
===================================================== */

function drawBlock(
    c,x,y,s,color,a=1
){

    c.save();

    c.globalAlpha=a;

    c.fillStyle="#030403";

    c.fillRect(
        x+2,
        y+2,
        s-2,
        s-2
    );

    c.fillStyle=color;

    c.fillRect(
        x+1,
        y+1,
        s-3,
        s-3
    );

    c.fillStyle=
    "rgba(255,255,255,.35)";

    c.fillRect(
        x+2,
        y+2,
        s-5,
        Math.max(2,s*.12)
    );

    c.restore();
}

function drawMatrix(
    c,m,ox,oy,s,color,a=1
){

    m.forEach(
        (row,y)=>{

        row.forEach(
            (v,x)=>{

            if(v){

                drawBlock(
                    c,
                    (ox+x)*s,
                    (oy+y)*s,
                    s,
                    color,
                    a
                );
            }
        });

    });
}


/* =====================================================
   MAIN DRAW
===================================================== */

function draw(){

    const w=
    canvas.clientWidth;

    const h=
    canvas.clientHeight;

    ctx.clearRect(0,0,w,h);

    ctx.fillStyle="#090d07";
    ctx.fillRect(0,0,w,h);

    const cell=
    w/COLS;

    ctx.strokeStyle=
    "rgba(163,230,53,.07)";

    for(
        let x=0;
        x<=COLS;
        x++
    ){

        ctx.beginPath();

        ctx.moveTo(
            x*cell,
            0
        );

        ctx.lineTo(
            x*cell,
            ROWS*cell
        );

        ctx.stroke();
    }

    for(
        let y=0;
        y<=ROWS;
        y++
    ){

        ctx.beginPath();

        ctx.moveTo(
            0,
            y*cell
        );

        ctx.lineTo(
            COLS*cell,
            y*cell
        );

        ctx.stroke();
    }


    for(
        let y=0;
        y<ROWS;
        y++
    ){

        for(
            let x=0;
            x<COLS;
            x++
        ){

            if(board[y][x]){

                drawBlock(
                    ctx,
                    x*cell,
                    y*cell,
                    cell,
                    board[y][x]
                );
            }
        }
    }


    if(player&&!ended){

        const ghost={
            matrix:player.matrix,
            x:player.x,
            y:player.y
        };

        while(
            !collides(ghost)
        )
            ghost.y++;

        ghost.y--;

        drawMatrix(
            ctx,
            ghost.matrix,
            ghost.x,
            ghost.y,
            cell,
            player.color,
            .12
        );

        drawMatrix(
            ctx,
            player.matrix,
            player.x,
            player.y,
            cell,
            player.color
        );
    }

    drawMini(
        nextCtx,
        queue[0]
    );

    drawMini(
        holdCtx,
        held
    );
}


/* =====================================================
   MINI
===================================================== */

function drawMini(c,type){

    const w=c.canvas.clientWidth;
    const h=c.canvas.clientHeight;

    c.clearRect(0,0,w,h);

    c.fillStyle="#060904";
    c.fillRect(0,0,w,h);

    if(!type)
        return;

    const m=
    PIECES[type].shape;

    const s=
    Math.min(
        w/(m[0].length+1),
        h/(m.length+1)
    );

    const ox=
    (w-m[0].length*s)/2;

    const oy=
    (h-m.length*s)/2;

    m.forEach(
        (row,y)=>{

        row.forEach(
            (v,x)=>{

            if(v){

                drawBlock(
                    c,
                    ox+x*s,
                    oy+y*s,
                    s,
                    PIECES[type].color
                );
            }
        });

    });
}


/* =====================================================
   UI
===================================================== */

function pad(n,d){

    return String(n)
    .padStart(d,"0");
}

function update(){

    document.getElementById(
        "score"
    ).textContent=
    pad(score,6);

    document.getElementById(
        "best"
    ).textContent=
    pad(best,6);

    document.getElementById(
        "lines"
    ).textContent=
    pad(lines,3);

    document.getElementById(
        "level"
    ).textContent=
    pad(level,2);
}

function popup(text){

    const p=
    document.getElementById("popup");

    p.textContent=text;

    p.classList.remove("show");

    void p.offsetWidth;

    p.classList.add("show");
}


/* =====================================================
   START
===================================================== */

function newGame(){

    audioStart();

    beep(330,.07,.35);

    document.getElementById(
        "startMenu"
    ).style.display="none";

    restart();
}


/* =====================================================
   PAUSE
===================================================== */

function pauseGame(){

    if(!started||ended)
        return;

    paused=!paused;

    const overlay=
    document.getElementById("overlay");

    if(paused){

        document.getElementById(
            "overlayTitle"
        ).textContent="PAUSED";

        document.getElementById(
            "overlayText"
        ).textContent=
        "GAME PAUSED";

        document.querySelector(
            ".overlayBtn"
        ).textContent=
        "CONTINUE";

        overlay.classList.add("show");

        beep(220,.08,.3);

    }else{

        overlay.classList.remove("show");

        beep(440,.08,.3);
    }
}


/* =====================================================
   OVERLAY ACTION
===================================================== */

function overlayAction(){

    /*
       GAME OVER:
       pressing this button completely
       resets the game.
    */

    if(ended){

        restart();

    }else{

        paused=false;

        document.getElementById(
            "overlay"
        ).classList.remove("show");
    }
}


/* =====================================================
   RESTART
===================================================== */

function restart(){

    resetBoard();

    queue=[];

    held=null;

    score=0;
    lines=0;
    level=1;

    paused=false;
    ended=false;
    started=true;

    fillQueue();

    spawn();

    document.getElementById(
        "overlay"
    ).classList.remove("show");

    update();

    beep(330,.08,.35);
}


/* =====================================================
   FULLSCREEN
===================================================== */

async function fullScreen(){

    try{

        if(!document.fullscreenElement){

            await document.documentElement
            .requestFullscreen();

        }else{

            await document.exitFullscreen();
        }

    }catch(e){}
}


/* =====================================================
   RESIZE
===================================================== */

function resize(){

    const r=
    canvas.getBoundingClientRect();

    const dpr=
    window.devicePixelRatio||1;

    canvas.width=
    r.width*dpr;

    canvas.height=
    r.height*dpr;

    ctx.setTransform(
        dpr,0,0,dpr,0,0
    );

    draw();
}

window.addEventListener(
    "resize",
    resize
);


/* =====================================================
   KEYBOARD
===================================================== */

document.addEventListener(
"keydown",
e=>{

    if(e.key==="ArrowLeft"){
        e.preventDefault();
        move(-1);
    }

    if(e.key==="ArrowRight"){
        e.preventDefault();
        move(1);
    }

    if(e.key==="ArrowDown"){
        e.preventDefault();
        softDrop();
    }

    if(e.key==="ArrowUp"){
        e.preventDefault();
        rotateRight();
    }

    if(e.code==="Space"){
        e.preventDefault();
        hardDrop();
    }

    if(e.key.toLowerCase()==="z")
        rotateLeft();

    if(e.key.toLowerCase()==="c")
        holdPiece();

    if(e.key.toLowerCase()==="p")
        pauseGame();
});


/* =====================================================
   TOUCH SWIPE
===================================================== */

let sx=0;
let sy=0;

canvas.addEventListener(
"touchstart",
e=>{

    sx=
    e.touches[0].clientX;

    sy=
    e.touches[0].clientY;

},
{passive:true}
);

canvas.addEventListener(
"touchend",
e=>{

    const x=
    e.changedTouches[0].clientX;

    const y=
    e.changedTouches[0].clientY;

    const dx=x-sx;
    const dy=y-sy;

    if(
        Math.abs(dx)<20 &&
        Math.abs(dy)<20
    ){

        rotateRight();
        return;
    }

    if(
        Math.abs(dx)>Math.abs(dy)
    ){

        move(dx>0?1:-1);

    }else if(dy>70){

        hardDrop();

    }else{

        softDrop();
    }

},
{passive:true}
);


/* =====================================================
   GAME LOOP
===================================================== */

function loop(t){

    const delta=t-last;

    last=t;

    if(
        started &&
        !paused &&
        !ended
    ){

        timer+=delta;

        const speed=
        Math.max(
            90,
            850-(level-1)*60
        );

        if(timer>=speed){

            player.y++;

            if(collides(player)){

                player.y--;

                lock();
            }

            timer=0;
        }
    }

    draw();

    requestAnimationFrame(loop);
}


/* =====================================================
   INIT
===================================================== */

resetBoard();

fillQueue();

resize();

spawn();

update();

requestAnimationFrame(loop);
