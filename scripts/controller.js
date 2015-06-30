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
    './sampler',
  ], function(
    GameClient,
    commonUI,
    misc,
    mobileHacks,
    touch,
    Sampler) {

  var globals = {
    //orientation: "portrait-primary",
    orientationRate: 1 / 10,
    releaseTime: 0.5,
    //debug: true,
  };

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

  misc.applyUrlSettings(globals);
  mobileHacks.fixHeightHack();

  var $ = document.getElementById.bind(document);

  function onScored(data) {

  };

  function handleSetColor(data) {
    document.body.style.backgroundColor = data.color;
  }

  g_client = new GameClient();

  g_client.addEventListener('scored', onScored);
  g_client.addEventListener('setColor', handleSetColor);

  commonUI.setupStandardControllerUI(g_client, globals);

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
  function handlePointerMove(id) {
    g_lastMoveTime = Date.now() * 0.001;
    handleButton(true, id);
  }

  function unpressButton() {
    var now = Date.now() * 0.001;
    if (now - g_lastMoveTime > globals.releaseTime) {
      handleButton(false, 0);
    }
  }

  $("input").addEventListener('pointermove', function() { handlePointerMove(0); }, false);
  $("input").addEventListener('pointerdown', function() { handlePointerMove(0); }, false);
  $("input").addEventListener('pointerup', function() { handlePointerMove(0); }, false);
  setInterval(unpressButton, 100);

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

});


