/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

// Start the main app logic.
requirejs(
  [ 'hft/gameclient',
    'hft/commonui',
    'hft/misc/misc',
    'hft/misc/mobilehacks',
    'hft/misc/touch',
    '../bower_components/hft-utils/dist/imageloader',
    '../bower_components/hft-utils/dist/imageutils',
    '../3rdparty/chroma.min',
    './sampler',
  ], function(
    GameClient,
    commonUI,
    misc,
    mobileHacks,
    touch,
    imageLoader,
    imageUtils,
    chroma,
    Sampler) {

  var $ = document.getElementById.bind(document);
  var globals = {
    orientation: "portrait-primary",
    orientationOptional: true,  // Don't ask user to orient if their system doens't support it
    orientationRate: 1 / 10,
    releaseTime: 0.5,
    //debug: true,
  };

  var g_ctx = $("c").getContext("2d");
  var g_name = "";
  var g_client;
  var g_orientation = {
    a: 0,
    b: 0,
    g: 0,
    x: 0,
    y: 0,
    z: 0,
    abs: false,
  };
  var g_buttons = {};
  var g_samplers = {
    x: new Sampler({numSamples: 11}),
    y: new Sampler({numSamples: 11}),
    z: new Sampler({numSamples: 11}),
  };
  var g_lastMoveTime = Date.now() * 0.001;
  var g_redraw = true;
  var g_wingNdx = -1;
  var g_offset = 20;

  misc.applyUrlSettings(globals);
  mobileHacks.fixHeightHack();

  var images = {
    wings: {
      url: "assets/wings.png",
    }
  };
  imageLoader.loadImages(images, start);

  function start() {
    g_client = new GameClient();

    function onScored(data) {

    };

    function handleSetColor(data) {
      document.body.style.backgroundColor =
          chroma(data.color).brighten().desaturate().css();
      images.wings.coloredImg = imageUtils.adjustHSV(
          images.wings.img,
          data.hsvAdjust.h,
          data.hsvAdjust.s,
          data.hsvAdjust.v);
      images.wings.darkImg = imageUtils.adjustHSV(
          images.wings.img,
          data.hsvAdjust.h,
          data.hsvAdjust.s,
          data.hsvAdjust.v - 0.5);
      g_redraw = true;
      g_wingNdx = data.wingNdx;
    }

    g_client.addEventListener('scored', onScored);
    g_client.addEventListener('setColor', handleSetColor);

    commonUI.setupStandardControllerUI(g_client, globals);

    function drawBothHalfs(img) {
      g_ctx.save();
      g_ctx.drawImage(
          img,
          g_wingNdx * 256, 0, 256, 256,
          -256, -128, 256, 256);
      g_ctx.scale(-1, 1);
      g_ctx.drawImage(
          img,
          g_wingNdx * 256, 0, 256, 256,
          -256, -128, 256, 256);
      g_ctx.restore();
    }

    function draw() {
      if (g_wingNdx < 0) {
        return;
      }
      g_ctx.clearRect(0, 0, g_ctx.canvas.width, g_ctx.canvas.height);
      g_ctx.save();
      g_ctx.translate(g_ctx.canvas.width / 2 | 0, g_ctx.canvas.height / 2 | 0);
      drawBothHalfs(images.wings.darkImg);
      g_ctx.translate(0, -g_offset);
      drawBothHalfs(images.wings.coloredImg);
      g_ctx.restore();
    }

    // Since we take input touch, mouse, and keyboard
    // we only send the button to the game when it's state
    // changes.
    function handleButton(pressed, id) {
      var button = g_buttons[id];
      if (pressed !== button) {
        g_buttons[id] = pressed;
        g_client.sendCmd('button', { id: id, pressed: pressed });
      }
    }
  //
  //  touch.setupButtons({
  //    inputElement: $("input"),
  //    buttons: [
  //      { element: $("input"), callback: function(e) { handleButton(e.pressed, 0); }, }, // eslint-disable-line
  //    ],
  //  });
    function handlePointerMove(id, press) {
      g_lastMoveTime = Date.now() * 0.001;
      handleButton(press, id);
      g_offset = press ? 2 : 20;
      draw();
    }

//    function unpressButton() {
//      var now = Date.now() * 0.001;
//      if (now - g_lastMoveTime > globals.releaseTime) {
//        handleButton(false, 0);
//      }
//      draw(20);
//    }

    $("input").addEventListener('pointermove', function() { handlePointerMove(0, true); }, false);
    $("input").addEventListener('pointerdown', function() { handlePointerMove(0, true); }, false);
    $("input").addEventListener('pointerup', function() { handlePointerMove(0), false; }, false);
    $("input").addEventListener('pointerout', function() { handlePointerMove(0), false; }, false);
//    setInterval(unpressButton, 100);

    var gn = new GyroNorm();

    function handleOrientationData(data) {
      g_orientation.a = data.do.alpha;
      g_orientation.b = data.do.beta;
      g_orientation.g = data.do.gamma;
      g_orientation.abs = data.do.absolute;

      var time = Date.now() * 0.001;
      g_samplers.x.addSample(data.dm.x, time);
      g_samplers.y.addSample(data.dm.y, time);
      g_samplers.z.addSample(data.dm.z, time);

    }

    function rnd(number, _decimalCount) {
      return Math.round(number * Math.pow(10, _decimalCount)) / Math.pow(10, _decimalCount);
    }

    function sendOrientationData() {
      g_orientation.x = rnd(g_samplers.x.getRange().abs, 1);
      g_orientation.y = rnd(g_samplers.y.getRange().abs, 1);
      g_orientation.z = rnd(g_samplers.z.getRange().abs, 1);
      commonUI.setStatus(JSON.stringify(g_orientation, undefined, " "));

      g_client.sendCmd('orient', g_orientation);
    }

    function setupDeviceOrientation() {
      gn.start(handleOrientationData);
      setInterval(sendOrientationData, globals.orientationRate * 1000);
    }

    function noDeviceOrientation() {
      $("no-orientation").style.display = "block";
    }

    var gnOptions = {
      frequency: 50,                  // ( How often the object sends the values - milliseconds )
      gravityNormalized: true,        // ( If the garvity related values to be normalized )
      orientationBase:GyroNorm.GAME,  // ( Can be GyroNorm.GAME or GyroNorm.WORLD. gn.GAME returns orientation values with respect to the head direction of the device. gn.WORLD returns the orientation values with respect to the actual north direction of the world. )
      decimalCount: 2,                // ( How many digits after the decimal point will there be in the return values )
      logger: null,                   // ( Function to be called to log messages from gyronorm.js )
      screenAdjusted: false           // ( If set to true it will return screen adjusted values. )
    };
    gn.init(gnOptions).then(setupDeviceOrientation, noDeviceOrientation);

    function render(time) {
      if (misc.resize(g_ctx.canvas) || g_redraw) {
        g_redraw = false;
        draw();
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }
});


