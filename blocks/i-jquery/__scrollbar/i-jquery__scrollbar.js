(function ($) {

    var scrollbar = function(element, options) {

        this.element = $(element);

        this.doc = $(document);

        this._initOptions(options);

        this.create();
    };

    scrollbar.prototype._initOptions = function(options) {
        this.options = $.extend({
            className: 'b-scrollbar',
            wheelSpeed: 20
        }, options);
    };

    scrollbar.prototype.create = function() {

        this._createVariables();

        this._initEvents();

        this._checkContent() ? this._showBar() : this._hideBar();
    };

    scrollbar.prototype._createVariables = function() {

        this.element.addClass(this.options.className);

        this.element.wrapInner($('<div/>')
            .addClass(this.options.className + '__bar-content')
            .css({ height: this.element.height() }));

        this.content = this.element.children('.' + this.options.className + '__bar-content');

        this.barContainer = $('<div/>')
            .addClass(this.options.className + '__bar-container')
            .appendTo(this.element);

        this.barDragger = $('<div/>')
            .addClass(this.options.className + '__bar-dragger')
            .appendTo(this.barContainer);

        this.barRail = $('<div/>')
            .addClass(this.options.className + '__bar-rail')
            .appendTo(this.barContainer);

        this._initHeight();

        this._updateBarSizeAndPosition();

    };

    scrollbar.prototype._initHeight = function() {

        this.contentHeight = this.content.children().outerHeight(false);

        this.containerHeight = this.element.height();

        if (!this.containerHeight) {
            this.containerHeight = $('.b-employees-combobox__suggest')
                .css('max-height').replace('px', '');
            this.containerHeight || (this.containerHeight = 300);
        }

        this.content.css('height', this.containerHeight + 'px');

        this.barContainer.css('height', this.containerHeight + 'px');
    };

    scrollbar.prototype._initEvents = function() {

        this._initWheelEvent();

        this._initMouseDragEvent();

        this._initMouseClickEvent();
    };

    scrollbar.prototype._hideBar = function() {
        this.barContainer.addClass(this.options.className + '__bar-container_hide_yes');
    };

    scrollbar.prototype._showBar = function() {
        this.barContainer.removeClass(this.options.className + '__bar-container_hide_yes');
    };


    scrollbar.prototype._checkContent = function() {
        return !(this.contentHeight - this.containerHeight <= 0);
    };

    scrollbar.prototype._contentScrollTo = function(position, options) {

        this.content.scrollTop(position);

        // update bar position
        this._updateBarSizeAndPosition();
    };

    scrollbar.prototype._updateBarSizeAndPosition = function() {

        if (this.containerHeight < this.contentHeight) {
            this.scale = this.containerHeight / this.contentHeight;
            this.scrollbarYHeight = this.scale * this.containerHeight;
            this.scrollbarYTop = this.content.scrollTop() * this.scale;
        } else {
            this.scrollbarYHeight = 0;
            this.scrollbarYTop = 0;
            this.content.scrollTop(0);
        }

        if (this.scrollbarYTop >= this.containerHeight - this.scrollbarYHeight) {
            this.scrollbarYTop = this.containerHeight - this.scrollbarYHeight;
        }

        this.barDragger.css({
            top: this.scrollbarYTop,
            height: this.scrollbarYHeight
        });
    };

    scrollbar.prototype._initWheelEvent = function() {
        // bind handlers
        var _this = this;

        this.content.mousewheel(function (e, delta, deltaX, deltaY) {
            _this._contentScrollTo(_this.content.scrollTop() - (deltaY * _this.options.wheelSpeed));
        });
    };

    scrollbar.prototype._initMouseDragEvent = function() {

        var _this = this;

        this.barDragger.on('mousedown.scrollbar', function (e) {
            _this.barDragger.addClass(_this.options.className + '__bar-dragger_scrolling_yes');
            _this.currentDownPosition = e.pageY;
            return false;
        });

        this.doc.on('mousemove.scrollbar', function (e) {
            if (_this.barDragger.hasClass(_this.options.className + '__bar-dragger_scrolling_yes')) {

                var deltaY = e.pageY - _this.currentDownPosition;

                _this.currentDownPosition = e.pageY;

                _this.scrollbarYTop += deltaY;

                if (_this.scrollbarYTop < 0) _this.scrollbarYTop = 0;

                if (_this.scrollbarYTop >= _this.containerHeight - _this.scrollbarYHeight) {
                    _this.scrollbarYTop = _this.containerHeight - _this.scrollbarYHeight;
                }

                _this.barDragger.css({
                    top: _this.scrollbarYTop
                });

                _this.content.scrollTop(_this.scrollbarYTop / _this.scale);

            }
            return false;
        });

        this.doc.on('mouseup.scrollbar', function (e) {
            if (_this.barDragger.hasClass(_this.options.className + '__bar-dragger_scrolling_yes')) {
                _this.barDragger.removeClass(_this.options.className + '__bar-dragger_scrolling_yes');
            }
            return false;
        });

    };

    scrollbar.prototype._initMouseClickEvent = function() {
        var _this = this;
        this.barRail.on('click.scroller', function (e) {

            var barDraggerOffset = _this.barDragger.position(),
                offsetY = e.offsetY || (e.pageY - _this.barContainer.offset().top);

            if (barDraggerOffset.top < offsetY) {
                _this.scrollbarYTop += _this.scrollbarYHeight;
            } else {
                _this.scrollbarYTop -= _this.scrollbarYHeight;
            }

            if (_this.scrollbarYTop < 0) _this.scrollbarYTop = 0;

            if (_this.scrollbarYTop >= _this.containerHeight - _this.scrollbarYHeight) {
                _this.scrollbarYTop = _this.containerHeight - _this.scrollbarYHeight;
            }

            _this.barDragger.animate({
                top: _this.scrollbarYTop
            }, {
                duration: 150,
                step: function () {
                    _this.content.scrollTop(_this.barDragger.position().top / _this.scale);
                }
            });
        });
    };

    scrollbar.prototype.update = function(options) {

        this._initHeight();

        this._updateBarSizeAndPosition();

        this._checkContent() ? this._showBar() : this._hideBar();

        if (undefined !== options.scrollTo) {
            this._contentScrollTo(options.scrollTo);
        }

        return this;
    };

    var checkMouseWheel = function(callback) {
        var _dlp = ('https:' == document.location.protocol) ? 'https:' : 'http:';

        if (!$.event.special.mousewheel) {
            return jQuery.getScript(_dlp+'//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.0.6/jquery.mousewheel.min.js', callback);
        }

        callback();
    };

    $.fn.scrollbar = function(options) {
        return this.each(function() {

            var $this = $(this),
                scrollObj;

            options = $.extend({}, options);

            if ($this.data('scrollbar') && !options.forceUpdate) {
                return $this.data('scrollbar').update(options);
            }

            // check mouse wheel plugin
            checkMouseWheel(function() {
                scrollObj = new scrollbar($this, options);
                $this.data('scrollbar', scrollObj);
            });

            return this;
        });
    };

})(jQuery);