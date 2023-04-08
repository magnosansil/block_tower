"use strict";

console.clear();
// representa o placo 3D com câmera ortográfica e luzes
class Stage {
  constructor() { //inicializa a cena, câmera e luzes na renderização 3D
    this.render = function () { //renderiza a cena na tela utilizando o 'renderer'
      this.renderer.render(this.scene, this.camera);
    };

    this.add = function (elem) {
      this.scene.add(elem); //adiciona elementos na tela
    };

    this.remove = function (elem) {
      this.scene.remove(elem); //remove elementos na tela
    };
    //inicialização de variáveis responsáveis para renderização da cena
    this.container = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer ({
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight); //define as dimensões da área de renderização
    this.renderer.setClearColor('#333344', 1); //define a cor de fundo da cena
    this.container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); //define a cena 3D
    let aspect = window.innerWidth / window.innerHeight;
    let d = 20;
    //inicializa câmera ortográfica que renderiza o objeto 3D sem perspectivas reais
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
    this.camera.position.x = 2;
    this.camera.position.y = 2;
    this.camera.position.z = 2;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.light = new THREE.DirectionalLight(0xffffff, 0.5); //simula a fonte principal de luz
    this.light.position.set(0, 499, 0);
    this.scene.add(this.light);
    this.softLight = new THREE.AmbientLight(0xffffff, 0.4); //ilumina toda a cena
    this.scene.add(this.softLight);
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  setCamera(y, speed = 0.3) { //atualiza a posição da câmera a partir da altura y e anima a transição com a velocidade speed
    TweenLite.to(this.camera.position, speed, {y: y + 4, ease: Power1.easeInOut});
    TweenLite.to(this.camera.lookAt, speed, {y: y, ease: Power1.easeInOut});
  }
  
  onResize() { //atualiza a visualização da cena para se ajustar ao tamanho da tela
    let viewSize = 30;
    //define o tamanho da renderização para o tamanho da janela
    this.renderer.setSize(window.innerWidth, window.innerHeight); 
    //ajusta a proporção da câmera
    this.camera.left = window.innerWidth / -viewSize; 
    this.camera.right = window.innerWidth / viewSize;
    this.camera.top = window.innerHeight / viewSize;
    this.camera.bottom = window.innerHeight / -viewSize;
    this.camera.updateProjectionMatrix(); //atualiza a matriz de projeção da câmera
  }  
}
//cria o bloco 3D e atribui parâmetros de dimensão e posição com atualização em tempo real
class Block {
  constructor(block) { //define as dimensões e posições do bloco e suas cores de forma aleatória
    this.STATES = { //define os três estados para os blocos
      ACTIVE: 'active',
      STOPPED: 'stopped',
      MISSED: 'missed'
    };
    this.MOVE_AMOUNT = 12; //define quantas vezes o bloco deve se mover por frame
    this.dimension = { //define as dimensões iniciais de largura, altura e profundidado do bloco
      width: 0,
      height: 0,
      depth: 0
    };
    this.position = { //define a posição dos eixos x, y e z do bloco
      x: 0,
      y: 0,
      z: 0
    };
    this.targetBlock = block; //referencia o bloco em que o bloco atual está sobreposto
    this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1; //define o índice do bloco atual
    //indica a sobreposição do bloco, nos eixos x e z e quais dimensões estão sobrepostas
    this.workingPlane = this.index % 2 ? 'x' : 'z'; 
    this.workingDimension = this.index % 2 ? 'width' : 'depth';
    this.dimension.width = this.targetBlock ? this.targetBlock.dimension.width : 10;
    this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
    this.dimension.depth = this.targetBlock ? this.targetBlock.dimension.depth : 10;
    this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
    this.position.y = this.dimension.height * this.index;
    this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
    //define a geração de cor do bloco aleatoriamente, a partir de um número de 0 a 100
    this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);

    if (!this.targetBlock) {
      this.color = 0xd0bcc7;
    } 
    else {
      let offset = this.index + this.colorOffset;
      var r = Math.sin(0.3 * offset) * 55 + 200;
      var g = Math.sin(0.3 * offset + 2) * 55 + 200;
      var b = Math.sin(0.3 * offset + 4) * 55 + 200;
      this.color = new THREE.Color(r / 255, g / 255, b / 255);
    }
  
    this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;
    this.speed = -0.1 - (this.index * 0.005); //define a velocidade que o bloco se move em tela
    if (this.speed < -4)
      this.speed = -4;
    this.direction = this.speed; //define a direção em que o bloco se move em tela

    let geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
    this.material = new THREE.MeshToonMaterial( {
      color: this.color,
      shading: THREE.FlatShading 
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(this.position.x, this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0), this.position.z);

    if (this.state == this.STATES.ACTIVE) {
      this.position[this.workingPlane] = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
    }
  }

  reverseDirection() { //define a direção reversa do bloco
    this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
  }

  place() { //define o estado do bloco, se está sobreposto ao bloco de destino e define as dimensões do próximo bloco
    this.state = this.STATES.STOPPED; //define o estado do bloco como parado
    //calcula a sobreposição do bloco atual com o bloco de destino
    let overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
    let blocksToReturn = { //define o bloco que será retornado
      plane: this.workingPlane,
      direction: this.direction
    };
    //define que se a sobreposição for menor que 0.3, o bloco sobreposto deve se encaixar no bloco de destino
    if (this.dimension[this.workingDimension] - overlap < 0.3) {
      overlap = this.dimension[this.workingDimension];
      blocksToReturn.bonus = true;
      this.position.x = this.targetBlock.position.x;
      this.position.z = this.targetBlock.position.z;
      this.dimension.width = this.targetBlock.dimension.width;
      this.dimension.depth = this.targetBlock.dimension.depth;
    }
    //define que se houver sobreposição imperfeita, o bloco será dividido em dois
    if (overlap > 0) {
      let choppedDimensions = {
        width: this.dimension.width, 
        height: this.dimension.height,
        depth: this.dimension.depth
      };
      choppedDimensions[this.workingDimension] -= overlap;
      this.dimension[this.workingDimension] = overlap;
      //define o mesh do bloco que foi encaixado
      let placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
      placedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
      let placedMesh = new THREE.Mesh(placedGeometry, this.material);
      //define o mesh do bloco que sobrou
      let choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
      choppedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(choppedDimensions.width / 2, choppedDimensions.height / 2, choppedDimensions.depth / 2));
      let choppedMesh = new THREE.Mesh(choppedGeometry, this.material);
      let choppedPosition = { //define a posição dos meshes na cena
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      };

      if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
        this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
      }

      else {
        choppedPosition[this.workingPlane] += overlap;
      }

      placedMesh.position.set(this.position.x, this.position.y, this.position.z);
      choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);
      //adiciona os meshes ao bloco retornado
      blocksToReturn.placed = placedMesh;

      if (!blocksToReturn.bonus)
        blocksToReturn.chopped = choppedMesh;
    }
    else {
      this.state = this.STATES.MISSED;
    }
    //atualiza a dimensão do bloco atual e retorna as informações do bloco
    this.dimension[this.workingDimension] = overlap;
    return blocksToReturn;
  }

  tick() { //define a movimentação do bloco
    //verifica se o estado do bloco é ativo
    if (this.state == this.STATES.ACTIVE) {
      let value = this.position[this.workingPlane];
      //verifica se "value" excede a quantidade de movimentos definida anteriormente
      if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT) 
        this.reverseDirection(); //se "value" excede "MOVE_AMOUNT", o movimento do bloco é revertido
      this.position[this.workingPlane] += this.direction;
      this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
    }
  }
}

class Game {
  constructor() { //define os estados do bloco
    this.STATES = {
      'LOADING': 'loading',
      'PLAYING': 'playing',
      'READY': 'ready',
      'ENDED': 'ended',
      'RESETTING': 'resetting'
    };
    //inicializa variáveis utilizadas na classe
    this.blocks = [];
    this.state = this.STATES.LOADING;
    this.stage = new Stage();
    this.mainContainer = document.getElementById('container');
    this.scoreContainer = document.getElementById('score');
    this.startButton = document.getElementById('start-btn');
    this.instructions = document.getElementById('instructions');
    this.scoreContainer.innerHTML = '0';
    this.newBlocks = new THREE.Group();
    this.placedBlocks = new THREE.Group();
    this.choppedBlocks = new THREE.Group();
    this.stage.add(this.newBlocks);
    this.stage.add(this.placedBlocks);
    this.stage.add(this.choppedBlocks);
    this.addBlock();
    this.tick();
    this.updateState(this.STATES.READY);
    //define as funções de mouse, teclado e touch para controle da jogabilidade
    document.addEventListener('keydown', e => {
      if (e.keyCode == 32)
        this.onAction();
    });

    document.addEventListener('click', e => {
      this.onAction();
    });

    document.addEventListener('touchstart', e => {
      e.preventDefault();
    });
  }

  updateState(newState) { //atualiza o estado do jogo e a classe CSS aplicada no HTML
    for (let key in this.STATES)
      this.mainContainer.classList.remove(this.STATES[key]);
    this.mainContainer.classList.add(newState);
    this.state = newState;
  }

  onAction() { //define o que acontece durante a jogabilidade a partir dos estados do bloco
    switch (this.state) {
      case this.STATES.READY:
        this.startGame();
        break;
      case this.STATES.PLAYING:
        this.placeBlock();
        break;
      case this.STATES.ENDED:
        this.restartGame();
        break;
    }
  }

  startGame() { //atualiza o estado do jogo para "playing"
    if (this.state != this.STATES.PLAYING) {
      this.scoreContainer.innerHTML = '0'; //redefine a pontuação para 0
      this.updateState(this.STATES.PLAYING);
      this.addBlock(); //adiciona o primeiro bloco
    }
  }

  restartGame() { //reseta o jogo e remove os blocos colocados anteriormente
    this.updateState(this.STATES.RESETTING);
    let oldBlocks = this.placedBlocks.children;
    let removeSpeed = 0.2;
    let delayAmount = 0.02;
    for (let i = 0; i < oldBlocks.length; i++) {
      TweenLite.to(oldBlocks[i].scale, removeSpeed, { x: 0, y: 0, z: 0, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn, onComplete: () => this.placedBlocks.remove(oldBlocks[i]) });
      TweenLite.to(oldBlocks[i].rotation, removeSpeed, { y: 0.5, delay: (oldBlocks.length - i) * delayAmount, ease:  Power1.easeIn });
    }
    //anima a câmera para se mover para a nova posição
    let cameraMoveSpeed = removeSpeed * 2 + (oldBlocks.length * delayAmount);
    this.stage.setCamera(2, cameraMoveSpeed);
    //atualiza a pontuação
    let countdown = { value: this.blocks.length - 1 };
    TweenLite.to(countdown, cameraMoveSpeed, {value: 0, onUpdate: () => { this.scoreContainer.innerHTML = String(Math.round(countdown.value)); }});
    this.blocks = this.blocks.slice(0, 1);
    setTimeout(() => {
      this.startGame();
    }, cameraMoveSpeed * 1000); //reinicia o jogo após 1000ms
  }

  placeBlock() { //insere os blocos na cena
    let currentBlock = this.blocks[this.blocks.length - 1]; //define o último bloco adicionado
    let newBlocks = currentBlock.place(); 
    this.newBlocks.remove(currentBlock.mesh); //remove o bloco atual da lista de novos blocos
    //define que se houve novos blocos gerados e posicionados, adiciona-os à lista de blocos posicionados
    if (newBlocks.placed)
      this.placedBlocks.add(newBlocks.placed);
    //define que se houve blocos cortados, adiciona-os à lista de blocos cortados e anima sua queda
    if (newBlocks.chopped) {
      this.choppedBlocks.add(newBlocks.chopped);
      let positionParams = { //define parâmetros de animação da queda do bloco cortado
        y: '-=30',
        ease: Power1.easeIn,
        onComplete: () => this.choppedBlocks.remove(newBlocks.chopped)
      };
      //define os parâmetros de rotação aleatória do bloco cortado
      let rotateRandomness = 10;
      let rotationParams = {
        delay: 0.05,
        x: newBlocks.plane == 'z' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
        z: newBlocks.plane == 'x' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
        y: Math.random() * 0.1
      };
      //define a posição final do bloco cortado após a queda
      if (newBlocks.chopped.position [newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
        positionParams[newBlocks.plane] = '+=' + (40 * Math.abs(newBlocks.direction));
      }
      else {
        positionParams[newBlocks.plane] = '-=' + (40 * Math.abs(newBlocks.direction));
      }
      TweenLite.to(newBlocks.chopped.position, 1, positionParams);
      TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
    }
    this.addBlock(); 
  }

  addBlock() { //adiciona um novo bloco
    let lastBlock = this.blocks[this.blocks.length - 1];
    //se o último bloco estiver no estado missed, o jogo termina
    if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
      return this.endGame();
    }
    this.scoreContainer.innerHTML = String(this.blocks.length - 1); //atualiza a pontuação do jogo
    //cria um novo bloco com base no último bloco adicionado e o adiciona à lista de novos blocos
    let newKidOnTheBlock = new Block (lastBlock); 
    this.newBlocks.add(newKidOnTheBlock.mesh);
    this.blocks.push(newKidOnTheBlock);
    this.stage.setCamera(this.blocks.length * 2); //ajusta a câmera para acompanhar o jogo
    if (this.blocks.length >= 5)
      this.instructions.classList.add('hide'); //esconde as instruções
  }

  endGame() { //atualiza o estado para "ENDED" e acaba o jogo
    this.updateState(this.STATES.ENDED); 
  }

  tick() { //atualiza a cena a partir do posicionamento do bloco
    this.blocks[this.blocks.length - 1].tick();
    this.stage.render();
    requestAnimationFrame(() => { this.tick(); }); //chama a função "tick" novamente para animar o próximo quadro;
}
}

let game = new Game();