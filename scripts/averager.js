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

define([
  ], function() {

  function Averager(options) {
    var numSamples = options.numSamples || 10;
    var samples = new Float32Array(numSamples);
    var timeStamps = new Float32Array(numSamples)
    var cursor = 0;
    var total = 0;

    this.addSample = function(v, timeStamp) {
       // remove old sample from total
       total -= samples[cursor];

       // add new sample
       samples[cursor] = v;
       total += v;

       timeStamps[cursor] = timeStamp || (Date.now() * 0.001);

       cursor = (cursor + 1) % numSamples;
    }

    this.getAverage = function() {
      return total / numSamples;
    }

    this.getRateForDuration = function() {
      var oldest = timeStamps[cursor];
      var newest = timeStamps[(cursor + numSamples - 1) % numSamples];
      var duration = newest - oldest;
      return total / duration;
    };

    this.getRange = function() {
      var min = samples[0];
      var max = min;
      for (var ii = 1; ii < numSamples; ++) {
        min = Math.min(samples[i], min);
        max = Math.max(samples[i], max);
      }

      return {
        min: min,
        max: max,
      };
    };
  }

  return Averager;
});


