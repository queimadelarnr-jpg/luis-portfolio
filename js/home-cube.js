/* Cube navigation controller. Original section content and scripts remain independent.
   Pin Three.js locally: r160.1. No build step or external assets required. */
(() => {
    'use strict';
    const home = document.querySelector('#home');
    const stage = home?.querySelector('.cube-stage');
    if (!stage) return;
    const fallback = stage.querySelector('.cube-fallback');
    const hint = home.querySelector('.cube-hint');
    const progress = home.querySelector('.cube-progress');
    const buttons = [...home.querySelectorAll('[data-cube-step]')];
    const backButton = document.querySelector('.cube-back');
    const autoButton = home.querySelector('.cube-autocomplete');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const fail = () => {
        home.querySelector('.cube-tile-layer')?.setAttribute('hidden','');
        home.querySelector('.cube-callouts')?.setAttribute('hidden','');
        fallback.hidden = false;
        fallback.textContent = 'The 3D cube is unavailable. Explore the portfolio:';
        const links=document.createElement('span');links.className='cube-fallback-links';
        ['about','drip','hindo','connect'].forEach(name=>{
            const link=document.createElement('button');link.type='button';link.textContent=name.toUpperCase();
            link.onclick=()=>{const project=name==='drip'||name==='hindo';switchPage(project?'work':name);if(project)document.querySelectorAll('.project-detail').forEach(detail=>detail.classList.toggle('is-open',detail.dataset.project===name));backButton.hidden=false;};links.appendChild(link);
        });
        fallback.appendChild(links);autoButton.hidden=true;
        backButton.onclick=()=>{switchPage('home');backButton.hidden=true;};
        hint.textContent = 'WELCOME HOME';
        buttons.forEach(button => { button.disabled = true; });
    };
    if (!window.THREE) { fail(); return; }
    const T = window.THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true }); }
    catch (_) { fail(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    stage.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    fallback.hidden = true;
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(0, 0, 10);
    const presentation = new T.Group();
    const cube = new T.Group();
    scene.add(presentation);
    presentation.add(cube);
    scene.add(new T.HemisphereLight(0xffffff, 0x797875, 2.3));
    const key = new T.DirectionalLight(0xffffff, 2.6);
    key.position.set(-3, 5, 7);
    scene.add(key);
    const css = getComputedStyle(document.documentElement);
    const palette = ['--red','--orange','--white','--black','--blue','--white']
        .map(name => css.getPropertyValue(name).trim());
    const body = new T.MeshStandardMaterial({ color: 0x17191b, roughness: .55 });
    const stickers = palette.map(color => new T.MeshStandardMaterial({ color, roughness: .48 }));
    // Shared beveled geometry keeps all 27 bodies and 54 stickers lightweight.
    function roundedBox(size, radius, depth) {
        const h = size / 2, r = radius;
        const shape = new T.Shape();
        shape.moveTo(-h+r,-h); shape.lineTo(h-r,-h);
        shape.quadraticCurveTo(h,-h,h,-h+r); shape.lineTo(h,h-r);
        shape.quadraticCurveTo(h,h,h-r,h); shape.lineTo(-h+r,h);
        shape.quadraticCurveTo(-h,h,-h,h-r); shape.lineTo(-h,-h+r);
        shape.quadraticCurveTo(-h,-h,-h+r,-h);
        const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled:true, bevelSize:.015, bevelThickness:.015, bevelSegments:2, steps:1, curveSegments:4 });
        geometry.translate(0,0,-depth/2);
        return geometry;
    }
    const bodyGeometry = roundedBox(.91,.06,.91);
    const stickerGeometry = roundedBox(.78,.055,.016);
    const faces = [
        { axis:'x', sign:1, rotation:[0,Math.PI/2,0] },
        { axis:'x', sign:-1, rotation:[0,-Math.PI/2,0] },
        { axis:'y', sign:1, rotation:[-Math.PI/2,0,0] },
        { axis:'y', sign:-1, rotation:[Math.PI/2,0,0] },
        { axis:'z', sign:1, rotation:[0,0,0] },
        { axis:'z', sign:-1, rotation:[0,Math.PI,0] }
    ];
    const pieces = [];
    const tiles = [];
    // Each face has its own editorial mix. Coloured stickers remain between previews.
    const tileContent = {
        portrait: { title:'Meet Luis', section:'about', image:'img/me_about.png', text:'MEET / LUIS' },
        designer: { title:'Web designer', section:'work', text:'WEB / DESIGNER' },
        freelance: { title:'Available for freelance', section:'connect', text:'AVAILABLE / FOR / FREELANCE' },
        about: { title:'Read more about me', section:'about', image:'img/me_about.png', text:'ABOUT / LUIS', previewText: "I'm Luis, a multidisciplinary creative and web designer based in Portugal. My background spans tattooing, photography and product design." },
        story: { title:'Tattooing, photography and design', section:'about', text:'TATTOO / PHOTO / DESIGN', interactive:false },
        skills: { title:'Web design, typography and interaction', section:'about', text:'WEB DESIGN / TYPOGRAPHY / INTERACTION', interactive:false },
        drip: { title:'Drip. — web design', section:'work', project:'drip', image:'img/drip_desktop.png', text:'DRIP.' },
        hindo: { title:'Hindo — web design', section:'work', project:'hindo', image:'img/hindo_desktop.png', text:'HINDO' },
        behance: { title:'View my Behance', section:'connect', text:'BEHANCE', action:'.connect-social.behance' },
        linkedin: { title:'Find me on LinkedIn', section:'connect', text:'LINKEDIN', action:'.connect-social.linkedin' },
        cv: { title:'Download my CV', section:'connect', text:'DOWNLOAD / MY CV', action:'.connect-cv' },
        email: { title:'Send me an email', section:'connect', text:'SEND ME / AN EMAIL', action:'.connect-email' }
    };
    const faceTiles = [
        ['drip',null,null,null,null,null,null,null,'hindo'],
        ['about',null,null,null,'story',null,null,null,'skills'],
        ['behance',null,'linkedin',null,null,null,'cv',null,'email'],
        ['portrait',null,null,null,'designer',null,null,null,'freelance'],
        ['portrait',null,'designer',null,null,null,'freelance',null,null],
        ['designer',null,null,null,'portrait',null,null,null,'freelance']
    ];
    const faceCounts = [0,0,0,0,0,0];
    function tileTexture(item) {
        const canvas=document.createElement('canvas'); canvas.width=canvas.height=512;
        const ctx=canvas.getContext('2d');
        const texture=new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace;
        function paint(image) {
            ctx.fillStyle=item.section==='connect'?'#EE9134':'#EFEDEA'; ctx.fillRect(0,0,512,512);
            if(image) {
                const scale=Math.max(512/image.width,512/image.height)*1.5;
                ctx.drawImage(image,(512-image.width*scale)/2,(512-image.height*scale)/2,image.width*scale,image.height*scale);
                ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,410,512,102);
                ctx.fillStyle='#EFEDEA';ctx.font='bold 33px sans-serif';ctx.fillText(item.section.toUpperCase()+' ↗',26,475);
            } else {
                ctx.fillStyle='#212529';ctx.font='900 64px sans-serif';
                item.text.split(' / ').forEach((line,i)=>ctx.fillText(line,24,130+i*86,464));
                ctx.font='30px sans-serif';if(item.interactive!==false)ctx.fillText(item.action ? (item.action==='.connect-cv'?'DOWNLOAD ↓':'OPEN ↗') : 'EXPLORE ↗',26,475);
            }
            texture.needsUpdate=true;
        }
        paint();
        if(item.image) { const image=new Image();image.onload=()=>{paint(image);wake();};image.src=window.CUBE_IMAGES?.[item.image] || item.image; }
        return texture;
    }
    const textures = new Map();
    for (let x=-1;x<=1;x++) for(let y=-1;y<=1;y++) for(let z=-1;z<=1;z++) {
        const piece = new T.Group();
        piece.position.set(x,y,z);
        piece.add(new T.Mesh(bodyGeometry,body));
        faces.forEach((face,i) => {
            if (piece.position[face.axis] !== face.sign) return;
            const sticker = new T.Mesh(stickerGeometry,stickers[i]);
            sticker.position[face.axis] = face.sign * .481;
            sticker.rotation.set(...face.rotation);
            piece.add(sticker);
            const tileKey=faceTiles[i][faceCounts[i]++];
            if(tileKey) {
                const item=tileContent[tileKey];
                if(!textures.has(tileKey)) textures.set(tileKey,tileTexture(item));
                const art=new T.Mesh(new T.PlaneGeometry(.77,.77),new T.MeshBasicMaterial({map:textures.get(tileKey)}));
                art.position.z=.025; sticker.add(art);
                if(item.interactive!==false)tiles.push({sticker,art,item,face:i});
            }
        });
        cube.add(piece); pieces.push(piece);
    }
    // Start solved, apply the inverse sequence backwards, then replay to solve.
    const sequence = [ ['y',1,1], ['x',-1,-1], ['z',1,1], ['y',-1,-1], ['x',1,1], ['y',1,-1] ];
    const vectors = { x:new T.Vector3(1,0,0), y:new T.Vector3(0,1,0), z:new T.Vector3(0,0,1) };
    function select(axis,layer) { return pieces.filter(piece => Math.round(piece.position[axis]) === layer); }
    function commit(selected,axis,angle) {
        const rotation = new T.Quaternion().setFromAxisAngle(vectors[axis],angle);
        selected.forEach(piece => {
            piece.position.applyQuaternion(rotation).round();
            piece.quaternion.premultiply(rotation).normalize();
        });
    }
    [...sequence].reverse().forEach(([axis,layer,sign]) => commit(select(axis,layer),axis,-sign*Math.PI/2));
    let step=0, turn=null, frame=0, previous=0, elapsed=0, broken=false;
    let section='home', destination=null, faceTurn=null, previewTile=null, modalPage=null;
    const faceAngles={ home:[.36,-.52,-.025], work:[0,-Math.PI/2,0], about:[0,Math.PI/2,0], connect:[Math.PI/2,0,0] };
    let pointer={x:0,y:0}, wheelTotal=0, lastWheel=0, suppressClickUntil=0;
    const active = () => !broken && home.classList.contains('page-visible') && !document.hidden;
    const interactive = () => !modalPage && active();
    function updateCaption() {
        progress.textContent = `${step} / ${sequence.length}`;
        home.dataset.cubeStep = step;
        hint.textContent = destination ? (destination==='home' && section==='home' ? 'COMPLETING YOUR CUBE…' : 'TURNING THE CUBE…') : section!=='home' ? section.toUpperCase()+' — EXPLORE THE TILES' : step === sequence.length ? 'CHOOSE A TILE — TAKE A LOOK INSIDE' : 'SCROLL TO COMPLETE ME';
        home.querySelector('.cube-controls').hidden = section!=='home' || !!destination; 
        autoButton.hidden = section!=='home' || step===sequence.length;
        autoButton.disabled = !!destination || !!turn;
        backButton.hidden = section==='home' && !destination;
        backButton.disabled = !!destination;
        buttons.forEach(button => { button.disabled = !!destination || !!turn || (Number(button.dataset.cubeStep)>0 ? step===sequence.length : step===0); });
    }
    function advance(direction) {
        if (!interactive() || section!=='home' || faceTurn || turn || step+direction<0 || step+direction>sequence.length) return;
        const [axis,layer,sign] = sequence[direction>0 ? step : step-1];
        turn = { axis, angle:sign*direction*Math.PI/2, direction, selected:select(axis,layer), elapsed:0 };
        turn.original = turn.selected.map(piece => ({ position:piece.position.clone(), quaternion:piece.quaternion.clone() }));
        updateCaption(); wake();
    }
    function draw(time) {
        frame=0;
        if (!active()) { previous=0; return; }
        const dt = previous ? Math.min(time-previous,50) : 16;
        previous=time; elapsed+=dt;
        if (turn) {
            turn.elapsed+=dt;
            const t=motion.matches ? 1 : Math.min(turn.elapsed/(destination?150:520),1);
            const ease=t*t*(3-2*t);
            const rotation=new T.Quaternion().setFromAxisAngle(vectors[turn.axis],turn.angle*ease);
            turn.selected.forEach((piece,i) => {
                piece.position.copy(turn.original[i].position).applyQuaternion(rotation);
                piece.quaternion.copy(turn.original[i].quaternion).premultiply(rotation);
            });
            if(t===1) {
                turn.selected.forEach(piece => { piece.position.round(); piece.quaternion.normalize(); });
                step+=turn.direction; turn=null; updateCaption();
            }
        }
        if(destination && !turn && !faceTurn) {
            if(step<sequence.length) advance(1);
            else {
                faceTurn={from:presentation.quaternion.clone(),to:new T.Quaternion().setFromEuler(new T.Euler(...faceAngles[destination])),elapsed:0};
            }
        }
        if(faceTurn) {
            faceTurn.elapsed+=dt;
            const t=motion.matches?1:Math.min(faceTurn.elapsed/850,1);
            presentation.quaternion.slerpQuaternions(faceTurn.from,faceTurn.to,t*t*(3-2*t));
            if(t===1) { section=destination;destination=null;faceTurn=null;home.dataset.cubeSection=section;updateCaption();updateInstructions();stage.focus({preventScroll:true}); }
        } else if(!destination) {
            const angles=faceAngles[section];
            const amount=section==='home'?1:.25;
            const target=new T.Quaternion().setFromEuler(new T.Euler(angles[0]+(motion.matches?0:pointer.y*.075*amount),angles[1]+(motion.matches?0:pointer.x*.1*amount),angles[2]));
            presentation.quaternion.slerp(target,motion.matches?1:1-Math.exp(-dt/150));
        }
        presentation.position.y = motion.matches || section!=='home' ? 0 : Math.sin(elapsed/1600)*.045;
        renderer.render(scene,camera);
        positionTiles();
        positionCallouts();
        if(!motion.matches || turn || faceTurn || destination) frame=requestAnimationFrame(draw);
    }

    function wake() { if(active() && !frame) frame=requestAnimationFrame(draw); }
    function resize() {
        const {width,height}=stage.getBoundingClientRect();
        if(!width || !height) return;
        camera.aspect=width/height;
        // Fit a bounding sphere even while a layer rotates, in either orientation.
        const halfFov=Math.atan(Math.tan(35*Math.PI/360)*Math.min(1,camera.aspect));
        camera.position.z=2.7/Math.sin(halfFov);
        camera.updateProjectionMatrix(); renderer.setSize(width,height,false); wake();
    }
    new ResizeObserver(resize).observe(stage);
    new MutationObserver(() => { wheelTotal=0; pointer={x:0,y:0}; wake(); }).observe(home,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange',wake);
    motion.addEventListener('change',wake);
    stage.addEventListener('pointermove',event => {
        if(event.pointerType==='touch') return;
        const box=stage.getBoundingClientRect();
        pointer={x:(event.clientX-box.left)/box.width*2-1,y:(event.clientY-box.top)/box.height*2-1}; wake();
    });
    stage.addEventListener('pointerleave',() => { pointer={x:0,y:0}; });
    home.addEventListener('wheel',event => {
        if(destination || !interactive() || event.ctrlKey || Math.abs(event.deltaX)>Math.abs(event.deltaY)) return;
        event.preventDefault();
        const now=performance.now();
        const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1);
        if(now-lastWheel>180 || Math.sign(delta)!==Math.sign(wheelTotal)) wheelTotal=0;
        lastWheel=now;
        if(turn) { wheelTotal=0; return; }
        wheelTotal+=delta;
        if(Math.abs(wheelTotal)>=80) { scrollStep(Math.sign(wheelTotal)); wheelTotal=0; }
    },{passive:false});
    function scrollStep(direction) {
        if(destination || !interactive())return;
        if(section==='home')advance(direction);
        else if(direction<0)navigate('home');
    }
    backButton.onclick=()=>navigate('home');
    autoButton.addEventListener('click',()=>{if(section==='home' && !destination && !turn)navigate('home');});
    let touch=null;
    stage.addEventListener('touchstart',event => { touch=event.touches.length===1?event.touches[0].clientY:null; },{passive:true});
    stage.addEventListener('touchend',event => {
        if(touch!==null && event.changedTouches.length) {
            const delta=touch-event.changedTouches[0].clientY;
            if(Math.abs(delta)>35) { suppressClickUntil=performance.now()+400; scrollStep(Math.sign(delta)); }
        }
        touch=null;
    },{passive:true});
    stage.addEventListener('touchcancel',() => { touch=null; },{passive:true});
    stage.addEventListener('keydown',event => {
        if(event.key==='ArrowDown' || event.key==='ArrowUp') { event.preventDefault(); scrollStep(event.key==='ArrowDown'?1:-1); }
    });
    buttons.forEach(button => button.addEventListener('click',() => advance(Number(button.dataset.cubeStep))));
    if(matchMedia('(pointer:coarse)').matches) home.querySelector('.cube-instruction').textContent='Swipe up to solve · down to rewind · or tap the arrows';
    renderer.domElement.addEventListener('webglcontextlost',event => { event.preventDefault(); broken=true; cancelAnimationFrame(frame); renderer.domElement.hidden=true; fail(); });
    // Project accessible hit targets onto the actual 3D stickers. Artwork stays in WebGL.
    const tileLayer=document.createElement('div');tileLayer.className='cube-tile-layer';stage.appendChild(tileLayer);
    const raycaster=new T.Raycaster();
    tiles.forEach((tile,index)=>{
        const button=document.createElement('button');button.type='button';button.className='cube-tile';
        button.setAttribute('aria-label',tile.item.title);button.dataset.tile=index;
        const preview=document.createElement('span');preview.className='cube-tile-preview';
        if(tile.item.image) {const img=document.createElement('img');img.src=tile.item.image;img.alt='';preview.appendChild(img);}
        else { const text=document.createElement('span');text.className='cube-preview-type';text.textContent=tile.item.text.replaceAll(' / ','\n');preview.appendChild(text); }
        if(tile.item.previewText) { const bio=document.createElement('span');bio.className='cube-preview-bio';bio.textContent=tile.item.previewText;preview.appendChild(bio); }
        const label=document.createElement('span');label.className='cube-preview-label';label.textContent=tile.item.title+' ↗';preview.appendChild(label);
        button.appendChild(preview);tileLayer.appendChild(button);tile.button=button;
        button.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')showPreview(tile);});
        button.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')clearPreview();});
        button.addEventListener('focus',()=>showPreview(tile));
        button.addEventListener('blur',clearPreview);
        let touchPress=false,alreadyPreviewed=false;
        button.addEventListener('pointerdown',event=>{touchPress=event.pointerType==='touch';alreadyPreviewed=previewTile===tile;});
        button.addEventListener('click',event=>{
            event.stopPropagation();
            if(!interactive() || turn || destination || performance.now()<suppressClickUntil) return;
            if(touchPress && !alreadyPreviewed) {showPreview(tile);return;}
            clearPreview();
            if(section==='home' || tile.item.section!==section) navigate(tile.item.section);
            else if(tile.item.action) document.querySelector(tile.item.action)?.click();
            else openContent(tile.item);
        });
    });
    // Solved-Home annotations track the actual moving stickers, not fixed screen points.
    const calloutLayer=document.createElement('div');calloutLayer.className='cube-callouts';calloutLayer.hidden=true;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');
    calloutLayer.appendChild(svg);stage.appendChild(calloutLayer);
    const callouts=[
        {title:'ABOUT ME',key:'portrait',side:'left',below:true},
        {title:'WORK',key:'designer',side:'left',below:false},
        {title:'CONNECT',key:'freelance',side:'right',below:true}
    ].map(item=>{
        const tile=tiles.find(tile=>tile.face===4 && tile.item===tileContent[item.key]);
        const label=document.createElement('button');label.type='button';label.className='cube-callout';label.textContent=item.title;
        label.addEventListener('click',()=>navigate(tile.item.section));
        const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
        const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','3');
        svg.append(line,dot);calloutLayer.appendChild(label);
        return {...item,tile,label,line,dot};
    });
    function positionCallouts() {
        const visible=section==='home' && step===sequence.length && !turn && !destination && !modalPage;
        calloutLayer.hidden=!visible;
        if(!visible)return;
        const width=stage.clientWidth,height=stage.clientHeight,compact=width<640;
        svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
        callouts.forEach(item=>{
            const box=item.tile.button.style;
            const tx=parseFloat(box.left)+(item.side==='left'?0:parseFloat(box.width));
            const ty=parseFloat(box.top)+parseFloat(box.height)*.5;
            const labelWidth=compact?84:108,labelHeight=32;
            let x,y;
            if(compact) {
                x=item.side==='left'?12:width-labelWidth-12;
                y=item.below?height-labelHeight-(item.side==='left'?28:8):16;
            } else {
                x=item.side==='left'?tx-labelWidth-60:tx+60;
                y=ty+(item.below?55:-70);
            }
            x=Math.max(12,Math.min(width-labelWidth-12,x));
            y=Math.max(12,Math.min(height-labelHeight-12,y));
            Object.assign(item.label.style,{left:`${x}px`,top:`${y}px`,width:`${labelWidth}px`});
            const sx=item.side==='left'?x+labelWidth:x,sy=y+labelHeight/2;
            const elbow=(sx+tx)/2;
            item.line.setAttribute('points',`${sx},${sy} ${elbow},${sy} ${tx},${ty}`);
            item.dot.setAttribute('cx',tx);item.dot.setAttribute('cy',ty);
        });
    }
    function showPreview(tile) {
        if(turn || destination || modalPage) return;
        if(previewTile)previewTile.button.classList.remove('is-preview');
        previewTile=tile;tile.button.classList.add('is-preview');
    }
    function clearPreview() { if(previewTile)previewTile.button.classList.remove('is-preview');previewTile=null; }
    function positionTiles() {
        const width=stage.clientWidth,height=stage.clientHeight;
        const stageRect=stage.getBoundingClientRect();
        tiles.forEach(tile=>{
            const center=tile.art.getWorldPosition(new T.Vector3());
            const normal=new T.Vector3(0,0,1).applyQuaternion(tile.art.getWorldQuaternion(new T.Quaternion()));
            const towardCamera=camera.position.clone().sub(center).normalize();
            const visible=!turn && !destination && !modalPage && normal.dot(towardCamera)>.45 && (section==='home' || tile.item.section===section);
            let hit=false;
            if(visible){raycaster.set(camera.position,towardCamera.clone().negate());const surface=raycaster.intersectObjects(cube.children,true)[0]?.object;hit=surface===tile.art || surface===tile.sticker;}
            tile.button.hidden=!visible || !hit;
            if(tile.button.hidden) {if(previewTile===tile)clearPreview();return;}
            const projected=center.clone().project(camera);
            const corners=[[-.385,-.385],[.385,-.385],[.385,.385],[-.385,.385]].map(([x,y])=>tile.art.localToWorld(new T.Vector3(x,y,0)).project(camera));
            const xs=corners.map(p=>(p.x+1)*width/2),ys=corners.map(p=>(1-p.y)*height/2);
            const left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
            Object.assign(tile.button.style,{left:`${left}px`,top:`${top}px`,width:`${w}px`,height:`${h}px`});
            tile.button.style.setProperty('--preview-origin',`${projected.x>.45?'right':projected.x<-.45?'left':'center'} ${projected.y>.45?'top':projected.y<-.45?'bottom':'center'}`);
            // The enlarged card has its own dimensions; fit it to the viewport,
            // rather than scaling a clipped, tile-sized text box.
            const cardWidth=Math.min(Math.max(180,w*1.65),280,Math.max(1,window.innerWidth-24));
            tile.button.style.setProperty('--preview-width',`${cardWidth}px`);
            const cardHeight=tile.button.querySelector('.cube-tile-preview').offsetHeight || 180;
            const cardX=Math.max(12,Math.min(window.innerWidth-cardWidth-12,stageRect.left+left+w/2-cardWidth/2));
            const cardY=Math.max(12,Math.min(window.innerHeight-cardHeight-12,stageRect.top+top+h/2-cardHeight/2));
            tile.button.style.setProperty('--preview-left',`${cardX-stageRect.left-left}px`);
            tile.button.style.setProperty('--preview-top',`${cardY-stageRect.top-top}px`);
            tile.button.setAttribute('aria-label',`${section==='home'?'Explore '+tile.item.section+': ':'Open '}${tile.item.title}`);
        });
    }
    function updateInstructions() {
        stage.setAttribute('aria-description',section==='about'?'About Luis. The portrait opens the biography. Decorative skill tiles read: Tattoo, Photo, Design; Web Design, Typography, Interaction.':'');
        const instruction=home.querySelector('.cube-instruction');
        instruction.textContent=section==='home'?'Scroll to complete · scroll up to rewind · or explore a tile':matchMedia('(pointer:coarse)').matches?'Tap to preview · tap again to open · swipe down to go back':'Hover to reveal · click to open · scroll up to go back';
    }
    function navigate(name) {
        if(!faceAngles[name] || broken)return;
        if(modalPage) { dialog.close(); restoreContent(); }
        clearPreview();
        // Always preserve the original pages for content/fallback; keep the cube mounted.
        document.querySelectorAll('.page').forEach(page=>page.classList.toggle('page-visible',page===home));
        destination=name;faceTurn=null;updateCaption();wake();
    }
    // Native dialog provides focus trapping, Escape dismissal and a return to the same face.
    const dialog=document.createElement('dialog');dialog.className='cube-content-dialog';
    dialog.setAttribute('aria-label','Portfolio content');
    const close=document.createElement('button');close.type='button';close.className='cube-content-close';close.textContent='← BACK TO CUBE';
    const contentHost=document.createElement('div');contentHost.className='cube-content-host';
    dialog.append(close,contentHost);document.body.appendChild(dialog);
    let placeholder=null,returnFocus=null;
    function openContent(item) {
        const page=document.querySelector(`.page[data-page="${item.section}"]`);if(!page)return;
        returnFocus=document.activeElement;clearPreview();
        placeholder=document.createComment('cube content return');page.before(placeholder);
        modalPage=page;contentHost.appendChild(page);page.classList.add('cube-content-page','page-visible');
        dialog.setAttribute('aria-label',item.title);dialog.showModal();close.focus();
        if(item.section==='about' && typeof triggerAboutEntrance==='function')setTimeout(triggerAboutEntrance,100);
        if(item.section==='work') {
            page.querySelectorAll('.project-detail').forEach(detail=>detail.classList.toggle('is-open',detail.dataset.project===item.project));
            page.querySelector('.work-inner')?.scrollTo({top:0,behavior:'auto'});
        }
        wake();
    }
    close.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    function restoreContent() {
        if(!modalPage)return;
        if(modalPage.dataset.page==='work')modalPage.querySelectorAll('.project-detail').forEach(detail=>detail.classList.remove('is-open'));
        modalPage.classList.remove('cube-content-page','page-visible');placeholder.replaceWith(modalPage);
        modalPage=null;placeholder=null;
        if(returnFocus?.isConnected)returnFocus.focus();else stage.focus();
        wake();
    }
    dialog.addEventListener('close',restoreContent);
    document.addEventListener('click',event=>{
        const target=event.target.closest('.home-title-link');
        if(!target || broken)return;
        event.preventDefault();event.stopImmediatePropagation();
        navigate('home');
    },true);
    stage.addEventListener('keydown',event=>{if(event.key==='Escape')clearPreview();});
    home.dataset.cubeSection='home';updateInstructions();

    presentation.rotation.set(.36,-.52,-.025);
    updateCaption(); resize(); wake();
})();
