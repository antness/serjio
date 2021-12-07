var template = document.createElement("div")
template.className = "cell";
var cellSize = {
  w: 26,
  h: 26,
};

function Cell(x, y) {
  this.x = x;
  this.y = y;
  this.elem = template.cloneNode();
  this.elem.style.top = (y * cellSize.h) + "px";
  this.elem.style.left = (x * cellSize.w) + "px";
  this.marked = false;

  this.elem.addEventListener("click", function () {
    this.setMark(!this.marked);
  }.bind(this));
}

Cell.prototype.setMark = function (mark) {
  if(this.marked === mark) {
    return Promise.resolve();
  }

  this.marked = mark;

  return new Promise(function (resolve, reject) {
    const cb = function () {
      resolve();
      this.elem.removeEventListener("transitionend", cb);
    }.bind(this);

    this.elem.addEventListener("transitionend", cb);

    if(this.marked) {
      this.elem.classList.add("marked");
    } else {
      this.elem.classList.remove("marked");
    }
  }.bind(this));
}

function Robot(grid) {
  this.grid = grid;
  this.x = 0;
  this.y = 0;
  this.elem = document.createElement("div");
  this.elem.className = "robot";
  this.elem.style.top = "0px";
  this.elem.style.left = "0px";
}

Robot.prototype.appendTo = function (el){
  el.appendChild(this.elem);
}

Robot.prototype.go = async function (xOffset, yOffset) {
  this.x += xOffset;
  this.y += yOffset;

  await this.elem.animate([
    {
      left: (this.x * cellSize.w)+"px",
      top: (this.y * cellSize.h)+"px",
    },
  ], {direction: "normal", iterations: 1, duration: 300, fill: "forwards", easing: "ease-out"}).finished;
};

Robot.prototype.flyTo = async function (x, y) {
  let oldX = this.x;
  let oldY = this.y;
  this.x = x;
  this.y = y;

  var distance = Math.sqrt(Math.pow(this.x - oldX, 2) + Math.pow(this.y - oldY, 2));

  var frames = [
    {
      left: (oldX * cellSize.w)+"px",
      top: (oldY * cellSize.h)+"px",
      transform: "rotate("+(360*0)+"deg)",
    },
    {
      left: (this.x * cellSize.w)+"px",
      top: (this.y * cellSize.h)+"px",
      transform: "rotate("+(360*4)+"deg)",
    },
  ];

  return await this.elem.animate(frames, {direction: "normal", iterations: 1, duration: 100*distance, fill: "forwards", easing: "ease-out"}).finished
    .then(() => {this.elem.style.transform = "none";});
}

Robot.prototype.goTo = async function (x, y) {
  while(this.x < x) {
    await this.right();
  }
  while(this.x > x) {
    await this.left();
  }
  while(this.y < y) {
    await this.down();
  }
  while(this.y > y) {
    await this.up();
  }
}

Robot.prototype.left = function () {
  return this.go(-1, 0);
}
Robot.prototype.right = function () {
  return this.go(1, 0);
}
Robot.prototype.up = function () {
  return this.go(0, -1);
}
Robot.prototype.down = function () {
  return this.go(0, 1);
}

Robot.prototype.mark = function () {
  let cell = this.currentCell();
  if(!cell.marked) {
    let prom1 = cell.setMark(true);

    var borderColor = this.elem.style.borderColor;
    let prom2 = this.elem.animate([
      {
        transform: "rotate(0deg)",
        borderColor: borderColor,
        offset: 0,
      },
      {
        transform: "rotate(90deg)",
        borderColor: "#ff8300",
        offset: 0.8,
      },
      {
        transform: "rotate(90deg)",
        borderColor: borderColor,
        offset: 1,
      }
    ], {iterations: 1, duration: 1250, fill: "forwards", easing: "ease-out"}).finished;

    return Promise.all([prom1, prom2]).then(() => true);
  }

  return Promise.resolve(false);
}

Robot.prototype.currentCell = function () {
  return this.grid.getCell(this.x, this.y);
}

Robot.prototype.checkCurrentCell = async function () {
  if(this.currentCell().marked) {
    await this.down();
    if(!this.currentCell().marked){
      await this.mark();
    }
    await this.up();
    await this.up();
    if(!this.currentCell().marked){
      await this.mark();
    }
    await this.down();
  }
}

Robot.prototype.run = async function () {
  await this.goTo(0, 3);
  for(var i = 0; i < this.grid.w; i++) {
    await this.checkCurrentCell();
    if(i < this.grid.w - 1) {
      await this.right();
    }
  }
  await this.flyTo(0, 0);
}

function Grid(w, h){
  this.w = w;
  this.h = h;
  this.cells = [];
  for(var i = 0; i < h; i++) {
    var row = [];
    for(var j = 0; j < w; j++) {
      row.push(new Cell(j, i));
    }
    this.cells.push(row);
  }
}

Grid.prototype.appendTo = function (el) {
  for(var i = 0; i < this.cells.length; i++) {
    for(var j = 0; j < this.cells[i].length; j++) {
      el.appendChild(this.cells[i][j].elem);
    }
  }
}

Grid.prototype.getCell = function (x, y) {
  return this.cells[y][x];
}

Grid.prototype.reset = function () {
  var promises = [];
  for(var x = 0; x < this.w; x++) {
    for(var y = 0; y < this.h; y++) {
      var prom = this.getCell(x, y).setMark(false);
      promises.push(prom);
    }
  }

  return Promise.all(promises);
}

Grid.prototype.randomize = function () {
  var promises = [];

  for(var x = 0; x < this.w; x++) {
    for(var y = 0; y < this.h; y++) {
      var cell = this.getCell(x, y);
      promises.push(cell.setMark(y === 3 && Math.random() < 0.3));
    }
  }

  return Promise.all(promises);
}


window.addEventListener("load", async function () {
  var gridElem = document.querySelector("#grid");
  var contentElem = gridElem.querySelector(".content");

  var grid = new Grid(30, 7);
  grid.appendTo(contentElem);

  var robot = new Robot(grid);
  robot.appendTo(contentElem);

  // //await robot.run();
  // console.log("before reset");
  // await grid.reset();
  // console.log("after reset");
  // await grid.randomize();
  // await robot.run();


  document.querySelector("#reset").addEventListener("click", () => {
    grid.reset();
  })
  document.querySelector("#random").addEventListener("click", async (a) => {
    await grid.randomize();
  })

  var goCounter = 0;
  document.querySelector("#go").addEventListener("click", async (ev) => {
    ev.target.disabled = true;
    goCounter++;
    if(goCounter === 2) {
      setTimeout(joke, 5000);
    }
    await robot.run();
    ev.target.disabled = false;
  })
});


function joke() {
  document.querySelector("body").animate(
    [
      {offset:0, transform: "translate(0, 0)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {transform: "translate(-0.5%, -0.5%)"},
      {transform: "translate(0.4%, 0.4%)"},
      {offset:0.05, transform: "rotate(-1deg)", },
      {offset:0.18, transform: "rotate(-1deg)", },
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {transform: "rotate(-2deg)"},
      {transform: "rotate(-1deg)"},
      {offset:0.21, transform: "rotate(-2deg)"},
      {offset:0.22, transform: "translate(1%, 1%) rotate(-7deg)", },
      {offset:0.39, transform: "translate(1%, 1%) rotate(-7deg)", easing: "ease-out"},
      {offset:0.42, transform: "translate(0, 0) rotate(-180deg)", easing: "ease-out"},
      {offset:0.95, transform: "translate(0, 0) rotate(-180deg)", easing: "ease-out"},
      {offset:1, transform: "translate(0, 0) rotate(-360deg)", easing: "ease-out"},
    ], {
      duration: 30000,
    }
  );
}
