define(["Tone/core/Tone", "Tone/component/Envelope", "Tone/source/Oscillator", 
	"Tone/signal/Signal", "Tone/component/Filter"], 
function(Tone){

	"use strict";

	/**
	 *  @class  the MonoSynth is a single oscillator, monophonic synthesizer
	 *          with vibrato, portamento, and a detuned unison
	 *
	 *  @constructor
	 *  @extends {Tone}
	 *  @param {Object} options the options available for the synth 
	 *                          see _defaults below
	 */
	Tone.MonoSynth = function(options){

		//get the defaults
		options = this.defaultArg(options, this._defaults);

		/**
		 *  the output
		 *  @type {GainNode}
		 */
		this.output = this.context.createGain();

		/**
		 *  the portamento (glide) time between notes in seconds
		 *  @type {Tone.Time}
		 */
		this.portamento = options.portamento;

		/**
		 *  the frequency control signal
		 *  @type {Tone.Signal}
		 */
		this.frequency = new Tone.Signal(440);

		/**
		 *  the first oscillator
		 *  @type {Tone.Oscillator}
		 *  @private
		 */
		this._osc0 = new Tone.Oscillator(0, options.oscType);

		/**
		 *  the second oscillator
		 *  @type {Tone.Oscillator}
		 *  @private
		 */
		this._osc1 = new Tone.Oscillator(0, options.oscType);
		this._osc1.detune.setValue(options.detune);

		/**
		 *  the filter
		 *  @type {Tone.Filter}
		 *  @private
		 */
		this._filter = new Tone.Filter(options.filter);

		/**
		 *  the filter envelope
		 *  @type {Tone.Envelope}
		 */
		this.filterEnvelope = new Tone.Envelope(options.filterEnvelope);

		/**
		 *  the amplitude envelope
		 *  @type {Tone.Envelope}
		 */
		this.envelope = new Tone.Envelope(options.envelope);

		//sync the oscillator frequecies to the master frequency
		this._osc0.frequency.sync(this.frequency, 1);
		this._osc1.frequency.sync(this.frequency, 1);
		//connect the oscillators to the output
		this._osc0.connect(this._filter);
		this._osc1.connect(this._filter);
		this._filter.connect(this.output);
		//start the oscillators
		this._osc0.start();
		this._osc1.start();
		//connect the envelopes
		this.filterEnvelope.connect(this._filter.frequency);
		this.envelope.connect(this.output.gain);
	};

	Tone.extend(Tone.MonoSynth);

	/**
	 *  @static
	 *  @private
	 */
	Tone.MonoSynth.prototype._defaults = {
		/** @type {Tone.Time} the glide time between notes */
		"portamento" : 0.05,
		/** @type {string} the type of oscillator */
		"oscType" : "square",
		/** @type {number} the detune between the unison oscillators */
		"detune" : 20,
		/** @type {Object} the filter properties */
		"filter" : {
			"Q" : 6,
			"frequency" : 4000,
			"type" : "lowpass"
		},
		/** @type {Object} the envelope properties */
		"envelope" : {
			"attack" : 0.005,
			"decay" : 0.1,
			"sustain" : 0.9,
			"release" : 1
		},
		/** @type {Object} the filter envelope properties */
		"filterEnvelope" : {
			"attack" : 0.06,
			"decay" : 0.2,
			"sustain" : 0.5,
			"release" : 2,
			"min" : 10,
			"max" : 4000
		}
	};

	/**
	 *  start the attack portion of the envelope
	 *  @param {string|number} note if a string, either a note name
	 *                              (i.e. C4, A#3) or a number in hertz
	 *  @param {Tone.Time=} [time=now] the time the attack should start
	 */
	Tone.MonoSynth.prototype.triggerAttack = function(note, time){
		//get the note value
		if (typeof note === "string"){
			note = this.noteToFrequency(note);
		} 
		//the envelopes
		this.envelope.triggerAttack(time);
		this.filterEnvelope.triggerExponentialAttack(time);
		//the port glide
		if (this.portamento > 0){
			var currentNote = this.frequency.getValue();
			time = this.toSeconds(time);
			this.frequency.setValueAtTime(currentNote, time);
			this.frequency.exponentialRampToValueAtTime(note, time + this.portamento);
		} else {
			this.frequency.setValueAtTime(note, time);
		}
	};

	/**
	 *  start the release portion of the envelope
	 *  @param {Tone.Time=} [time=now] the time the release should start
	 */
	Tone.MonoSynth.prototype.triggerRelease = function(time){
		this.envelope.triggerRelease(time);
		this.filterEnvelope.triggerExponentialRelease(time);
	};

	/**
	 *  set the oscillator type
	 *  @param {string} oscType the type of oscillator
	 */
	Tone.MonoSynth.prototype.setOscType = function(type){
		this._osc0.setType(type);
		this._osc1.setType(type);
	};

	/**
	 *  set the detune between the oscillators
	 *  @param {number} detune detune value in cents
	 */
	Tone.MonoSynth.prototype.setDetune = function(detune){
		this._osc1.detune.setValue(detune);
	};

	/**
	 *  set the members at once
	 *  @param {Object} params all of the parameters as an object.
	 *                         params for envelope and filterEnvelope 
	 *                         should be nested objects. 
	 */
	Tone.MonoSynth.prototype.set = function(params){
		if (!this.isUndef(params.detune)) this.setDetune(params.detune);
		if (!this.isUndef(params.oscType)) this.setOscType(params.oscType);
		if (!this.isUndef(params.filterEnvelope)) this.filterEnvelope.set(params.filterEnvelope);
		if (!this.isUndef(params.envelope)) this.envelope.set(params.envelope);
		if (!this.isUndef(params.filter)) this._filter.set(params.filter);
	};

	/**
	 *  clean up
	 */
	Tone.MonoSynth.prototype.dispose = function(){
		Tone.prototype.dispose.call(this);
		this._osc0.dispose();
		this._osc1.dispose();
		this.envelope.dispose();
		this.filterEnvelope.dispose();
		this.frequency.dispose();
		this._filter.dispose();
		this._osc0 = null;
		this._osc1 = null;
		this.frequency = null;
		this.filterEnvelope = null;
		this.envelope = null;
		this._filter = null;
	};

	return Tone.MonoSynth;
});