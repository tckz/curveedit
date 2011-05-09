/*
 * 曲線エディタ
 * https://github.com/tckz/curveedit
 * 
 * Copyright(c) 2011 tckz<at.tckz@gmail.com>
 * This software is licensed under the MIT license.
 * See COPYRIGHT.txt 
 */

/**
 * エディタ:view
 */
var EditorView = function() {
    this.initialize.apply(this, arguments);
}

EditorView.prototype = {
	initialize: function(canvas, mes) {
		this.canvas = canvas;
		this.el_message = mes;

		// ドットIDをキーとした描画エレメントのハッシュ
		this.dots = {};

		this.prepareDrawingPane();
	},
	close: function() {
		for (var id in this.dots) {
			var el = this.dots[id];
			$(el).remove();

			delete this.dots[id];
		}
	},
	redrawDots: function(model) {
		// ドットのインデックス
		var i = 0;
		for (var dot = model.first; is_defined(dot); i++, dot = dot.next) {
			var el_dot = this.dots[dot.id];
			// モデルの座標に合わせて描画位置調整
			this.adjustDotView(el_dot, dot);

			// 選択状態を反映
			el_dot.children(".selected-icon").toggle(dot.selected);

			// ドットのインデックスを表示/非表示
			el_dot.children(".dot-index").text(i.toString()).toggle(model.getShowIndex());
		}

		// 描画ドット側にあって、モデル側にないものを探す
		var should_be_deleted = [];
		for (var dot_id in this.dots) {
			if (!model.findDotById(dot_id)) {
				should_be_deleted.push(dot_id);
			}
		}

		// 浮いた描画ドットを削除する。
		for (var i = 0; i < should_be_deleted.length; i++) {
			var dot_id = should_be_deleted[i];
			var dot = this.dots[dot_id];
			$(dot).remove();
			delete this.dots[dot_id];
		}
	},
	update: function(model, p) {
		this.redraw(model);

		var sels = model.getSelected();
		if (sels.length == 1) {
			this.el_message.text("(" + Math.floor(sels[0].x) + ", " + Math.floor(sels[0].y) + ")");
		} else {
			this.el_message.text("");
		}
	},
	redraw: function(model) {
		this.redrawDots(model);

		if (is_defined(model.getBackgroundImage())) {
			this.canvas.parent().children(".drawing-back").css({
				"background-image": "url(\"" + model.getBackgroundImage() + "\")"
			});
		}

		this.clearCanvas(this.canvas);
		this.drawCanvas(model, this.canvas);

		// ハンドルの補助線
		var handle = model.getCurrentHandle();
		if (handle) {
			var ctx = this.canvas.get(0).getContext("2d");
			var dot = handle.dot;
			var next_dot = model.nextDot(dot);
			var prev_dot = model.previousDot(dot);

			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.lineJoin ="miter";
			ctx.strokeStyle = "red";
			ctx.moveTo(dot.x, dot.y);
			ctx.lineTo(prev_dot.cp2x, prev_dot.cp2y);

			ctx.moveTo(dot.x, dot.y);
			ctx.lineTo(dot.cp1x, dot.cp1y);
			ctx.stroke();
			ctx.closePath();
		}

	},
	clearCanvas: function(canvas) {
		var w = canvas.width();
		var h = canvas.height();
		var ctx = canvas.get(0).getContext("2d");
		ctx.clearRect(0, 0, w, h);
	},
	/**
	 * 図だけを描画する関数
	 */
	drawCanvas: function(model, canvas, opt) {
		var dots = model.dots;
		if (dots.length < 2) {
			return;
		}
	
		var ctx = canvas.get(0).getContext("2d");

		if (opt && opt.scale) {
			ctx.scale(opt.scale, opt.scale);
		}

		ctx.beginPath();
		ctx.strokeStyle = "black";
		ctx.fillStyle = "black";
		ctx.lineWidth = 6;
		ctx.lineJoin ="round";
		ctx.moveTo(model.last.x, model.last.y);

		for (var dot = model.first; is_defined(dot); dot = dot.next) {
			var prev_dot = model.previousDot(dot);

			var cp1x = is_defined(prev_dot.cp1x) ? prev_dot.cp1x : prev_dot.x;
			var cp1y = is_defined(prev_dot.cp1y) ? prev_dot.cp1y : prev_dot.y;
			var cp2x = is_defined(prev_dot.cp2x) ? prev_dot.cp2x : dot.x;
			var cp2y = is_defined(prev_dot.cp2y) ? prev_dot.cp2y : dot.y;
			ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, dot.x, dot.y);
		}
		ctx.closePath();
		ctx.stroke();

	},
	prepareDrawingPane: function() {
		parent = this.canvas.parent();
		parent.css({
			"position": "relative"
		});
		parent.children(".drawing-back")
			.css({
				"position": "absolute",
				"background-repeat": "no-repeat",
				"opacity": 0.3
			})
			.width(parent.innerWidth())
			.height(parent.innerHeight());
		this.canvas.get(0).width = parent.innerWidth();
		this.canvas.get(0).height = parent.innerHeight();

		this.canvas.css({
			"position": "absolute",
			"z-index": 0
		});
	},
	/**
 	 * 図上の座標から、描画される「ドット」のtop/leftを設定する。
 	 * ドット要素（divなど）の高さ/幅を勘案してオフセットを加算する。
 	 */
	adjustDotView: function(el_dot, dot) {
		adjustPositionByCenter(el_dot, dot.x, dot.y);
		
		return	el_dot;
	},
	/**
	 * ドット画像要素を作成
	 */
	newDotElement: function(dot) {
		var el_dot = $("<div/>")
			.attr({
				"class": "dot"
			})
			.css({
				position: "absolute",
			})
			.append($("<div/>")
				.attr({
					class: "selected-icon"
				})
				.css({
					position: "absolute",
					display: "none"
				})
			).append($("<div/>")
				.attr({
					class: "dot-index"
				})
				.css({
					position: "absolute",
					display: "none"
				})
			).data({
				model: dot
			});
		;

		this.adjustDotView(el_dot, dot);

		this.canvas.parent().append(el_dot);

		this.dots[dot.id] = el_dot;


		return	el_dot;
	},
	/**
	 * ハンドル要素を作成
	 * ノブだけ。
	 */
	newHandleElement: function() {
		var make_knob = function() {
			return $("<div/>")
				.attr({
					class: "knob"
				})
				.css({
					position: "absolute"
				})
			;
		}

		var knobs = $("<div/>")
			.append(make_knob())
			.append(make_knob())
			.children("div")
			;
		this.canvas.parent().append(knobs);

		return knobs;
	}

};


