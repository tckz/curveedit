/**
 * エディタ:controller
 */
var EditorController = function() {
    this.initialize.apply(this, arguments);
}

EditorController.prototype = {
	initialize: function(model, view) {
		this.visible_handle = undefined;
	},
	call_redraw: function() {
		this.model.notifier.notify();
	},
	/**
	 * ハンドル座標に相対座標を加算
	 */
	setHandlePositionRelative: function(rx, ry) {
		var handle = this.model.getCurrentHandle()
		if (handle) {
			// ドットの座標をノブに反映
			for (var i = 0; i < 2; i++) {
				var pos = handle.getKnobPosition(i);
				handle.setKnobPosition(i, pos.x + rx, pos.y + ry, HandleModel.Mode.Normal);
			}
		}
	},
	/**
	 * 指定ドットを相対座標指定で移動
	 *
	 * 制御点もドットに合わせて移動。
	 * ただし、あるドットが移動することで追随するのは、
	 * 当該ドットの制御点1と、「前のドット」の制御点2
	 */
	moveDotRelative: function(dot, rx, ry) {
		dot.setPositionRelative(rx, ry, rx, ry);
		var prev = this.model.previousDot(dot);
		prev.setPositionRelative(0, 0, 0, 0, rx, ry);
	},
	attachDotView: function(dot) {
		var self = this;
		var el_dot = self.view.newDotElement(dot);

		/*
		 * ドラッグ開始時点の座標からの移動量を求めるための元ネタ
		 * "start"のときに座標を設定する
		 */
		var bx;
		var by;

		// ドラッグイベント時のドットモデルの座標更新＋再描画
		var call_redraw = function(src, ev, ui) {
			var position = ui.position;
			// ドラッグされた座標
			var x = position.left + Math.floor(src.width() / 2);
			var y = position.top + Math.floor(src.height() / 2);

			// ドラッグ開始位置からの移動量
			var rbx = x - bx;
			var rby = y - by;

			// 今回移動量
			var rx = x - dot.x;
			var ry = y - dot.y;

			$.each(self.model.getSelected(), function(index, dot) {
				self.moveDotRelative(dot, rx, ry);
			});

			self.setHandlePositionRelative(rx, ry);

			self.call_redraw();
		};

		// 画面上のdotのイベント割付
		el_dot.draggable({
			"opacity": 0.8,
			"containment": "parent",
			"start": function(ev, ui) {
				// ドラッグ開始座標保存
				bx = dot.x;
				by = dot.y;
			},
			"drag": function(ev, ui) {
				if (!dot.selected) {
					self.model.setSelectedAll(false);
				}
				self.model.setSelected([dot], true);
				self.showHandle(dot);
				call_redraw($(this), ev, ui);
			},
			"stop": function(ev, ui) {
				call_redraw($(this), ev, ui);
			},
			"scroll": true
		}).click(function(ev){
			if (!ev.ctrlKey) {
				self.model.setSelectedAll(false);
			}
			self.model.setSelected([dot], !dot.selected);

			if (dot.selected) {
				// ハンドル
				self.showHandle(dot);
			}

			self.call_redraw();
		}).hover(
			function(){
				$(this).css({"border": "thin dotted black"});
			}, 
			function(){
				$(this).css({"border": "none"});
			}
		);
		
	},
	setView: function(v) {
		if (this.view) {
			this.view.close();
		}
		this.view = v;
	},
	setModel: function(m) {
		this.model = m;
	},
	showMessageBox: function(opt) {
		var d = $("<div>"+opt.message+"</div>");
		d.dialog({
			title: opt.title,
			width: "auto",
			height: "auto",
			buttons: {
				"OK": function(ev) {
					$(this).dialog("close")
				}
			},
			close: function(ev) {
				$(this).remove();
			},
			modal: true
		});
	},
	init: function() {
		var model = new EditorModel();
		var view = new EditorView($("#drawing"), $("#mes"));
		model.notifier.addObserver(view);
		this.setModel(model);
		this.setView(view);
	},
	run: function() {
		this.init();

		var self = this;

		// 選択モードか否か
		var dots_selectable = true;

		var drawing_pane = $("#drawing-pane");

		var toggle_dots_selectable = function(flag) {
			dots_selectable = (is_defined(flag) ? flag : !dots_selectable);
			drawing_pane.selectable(dots_selectable ? "enable" : "disable");
			$(".mode-select input[name=mode]").val([dots_selectable ? "0" : "1"]);
		};

		drawing_pane.selectable({
			disabled: !dots_selectable,
			start: function(ev, opt) {
				self.closeHandle();
			},
			stop: function(ev, opt) {
				// disabled=trueでselectableしてもcanvas上をクリックするとイベントがきてる
				if (!dots_selectable) {
					return;
				}

				var selected = [];
				$(this).find(".ui-selected").each(function(index, e) {
					selected.push($(e).data("model"));
				});
				self.model.setSelectedAll(false);
				self.model.setSelected(selected, true);
				self.call_redraw();
			},
			filter: ".dot"
		});

		// 初期状態をradioに設定
		toggle_dots_selectable(dots_selectable);

		$("#mode-select").change(function(ev) {
			toggle_dots_selectable(true);
		});

		$("button").button();
		$(".mode-select").buttonset();

		$("#mode-new-dot").change(function(ev) {
			toggle_dots_selectable(false);
		});

		$("#button-show-index").click(function(ev) {
			self.model.setShowIndex(!self.model.getShowIndex());
			self.call_redraw();
		});

		$("#button-show-thumbnail").click(function(ev) {
			var scale_ratio = 0.3;
			var thumb_w = self.view.canvas.width() * scale_ratio;
			var thumb_h = self.view.canvas.height() * scale_ratio;
			var d = $("<div/>")
				.append(
					$("<img>")
						.attr({
							width: thumb_w,
							height: thumb_h
						})
						.css({
							// 現在のところ黒線で描画しているから。
							"background-color": "white"
						})
				);
			var canvas = $("<canvas/>");
			canvas.get(0).width = thumb_w;
			canvas.get(0).height = thumb_h;

			// 小さいcanvasに描画
			self.view.clearCanvas(canvas);
			self.view.drawCanvas(self.model, canvas, {scale: scale_ratio});
			d.children("img").attr("src", canvas.get(0).toDataURL("image/png"));
			canvas.remove();

			d.dialog({
					title: "Thumbnail test",
					width: "auto",
					height: "auto",
					buttons: {
						"OK": function(ev) {
							$(this).dialog("close");
						}
					},
					close: function(ev) {
						$(this).remove();
					},
					modal: true
				});
		});

		$("#button-see-bg").click(function(ev) {
			self.closeHandle();
			self.model.setSelectedAll(false);
			self.view.canvas.toggle();
			self.call_redraw();
		});


		var attach_arrow = function(selector, rx, ry) {
			var move_once = function() {
				$.each(self.model.getSelected(), function(i, dot) {
					self.moveDotRelative(dot, rx, ry);
				});
				self.setHandlePositionRelative(rx, ry);
				self.call_redraw();
			};

			$(selector).mousedown(function(ev) {
				move_once();
				var timer = window.setInterval(function() {
					move_once();
				}, 200);

				$(ev.target).one("mouseup mouseout", function(ev) {
					window.clearInterval(timer);
				});
			});
		};

		attach_arrow("#button-up", 0, -1);
		attach_arrow("#button-down", 0, 1);
		attach_arrow("#button-right", 1, 0);
		attach_arrow("#button-left", -1, 0);

		$("#button-background-url").click(function(ev) {
			var result = self.model.setBackgroundImage($("#background-url").val());
			if (!result.success) {
				self.showMessageBox({
					message: result.message,
					title: "BG Image URL"
				});
			}
		});

		$("#button-deserialize").click(function(ev) {
			self.closeHandle();

			var v = $("#data").val();
			try {
				var t = $.secureEvalJSON(v);
			} catch (e) {
				self.showMessageBox({
					message: e,
					title: "deserialize"
				});
				return;
			}

			var new_model = new EditorModel();
			new_model.fromSerializable(t);
			var new_view = new EditorView(self.view.canvas, $("#mes"));
			self.setView(new_view);

			for (var i = 0; i < new_model.getDotsCount(); i++) {
				self.attachDotView(new_model.getDot(i));
			}

			self.setModel(new_model);

			$("#background-url").val(t.background_image);
			self.model.setBackgroundImage($("#background-url").val());

			self.model.notifier.addObserver(self.view);

			toggle_dots_selectable(true);

			self.call_redraw();
		});

		$("#button-serialize").click(function(ev) {
			var t = self.model.toSerializable();

			$("#data").val($.toJSON(t));
		});

		$("#button-delete").click(function(ev) {
			var sels = self.model.getSelected();
			if (sels.length == 0) {
				self.showMessageBox({
					message: "Select one or more dots.",
					title: "Delete dot"
				});
				return;
			}
			self.closeHandle();
			self.model.deleteDots(sels);
		});

		this.view.canvas.click(function(ev) {
			if (dots_selectable) {
				// 選択モード時は打点できないことにした。
				return;
			}

			var offset = $(this).offset();
			var x = Math.floor(ev.pageX - offset.left);
			var y = Math.floor(ev.pageY - offset.top);

			var neighbor_dot = undefined;
			var sels = self.model.getSelected();
			if (sels.length == 1) {
				neighbor_dot = sels[0];
			}

			var dot = self.model.newDot(x, y, neighbor_dot);
			// デフォルト制御点設定
			var num_dots = self.model.getDotsCount();
			if (num_dots == 3) {
				// 3点未満のときは重心がないため未計算。ここで改めて計算
				self.model.setDefaultCPPosition(self.model.getDot(0));
				self.model.setDefaultCPPosition(self.model.getDot(1));
			}

			if (num_dots >= 3) {
				self.model.setDefaultCPPosition(dot);
				/*
				 * 今回置いたドットの次のドット
				 * smoothな位置に設定しなおすのでモード選択できたほうがいいかも
				 */
				self.model.setDefaultCPPosition(self.model.nextDot(dot));
			}

			var el_dot = self.attachDotView(dot);

			self.model.setSelectedAll(false);
			self.model.setSelected([dot], true);
			self.showHandle(dot);
			self.call_redraw();
		});

		this.call_redraw();
	},
	// 表示済ハンドルがあれば、これを削除
	closeHandle: function() {
		if (this.model.getCurrentHandle()) {
			this.visible_handle.view.close();
			this.visible_handle = undefined;
			this.model.setCurrentHandle(undefined);
			this.call_redraw();
		}
	},
	/**
	 * ハンドル表示開始
	 *
	 * @param dot 中心となるdot
	 */
	showHandle: function(dot) {
		if (this.model.getDotsCount() < 3) {
			return;
		}

		this.closeHandle();

		var h = new HandleModel(dot, this.model.previousDot(dot), this.model.nextDot(dot));
		this.model.setCurrentHandle(h);
		var knobs = this.view.newHandleElement();
		var v = new HandleView(knobs);
		h.notifier.addObserver(v);
		h.notifier.notify();

		this.visible_handle = {
			model: h,
			view: v
		};

		var self = this;

		// ドラッグイベント時のノブモデル反映
		var update_knob = function(index, src, ev, ui) {
			var position = ui.position;
			var x = position.left + Math.floor(src.width() / 2);
			var y = position.top + Math.floor(src.height() / 2);
			// キー同時押しでSmooth
			h.setKnobPosition(index, x, y, (ev.shiftKey? HandleModel.Mode.Smooth : HandleModel.Mode.Normal));
			self.call_redraw();
		};

		var drag_containment = this.view.canvas.parent();
		var knob_index = 0;
		knobs.each(function() {
			var index = knob_index;
			$(this).draggable({
				"opacity": 0.8,
				"containment": drag_containment,
				"start": function(ev, ui) {
				},
				"drag": function(ev, ui) {
					update_knob(index, $(this), ev, ui);
				},
				"stop": function(ev, ui) {
					update_knob(index, $(this), ev, ui);
				},
				"scroll": true
			}).hover(
				function(){
					$(this).css({"border": "thin dotted black"});
				}, 
				function(){
					$(this).css({"border": "none"});
				}
			);

			knob_index++;
		});
	}
};

