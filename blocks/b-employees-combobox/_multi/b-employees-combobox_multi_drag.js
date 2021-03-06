BEM.DOM.decl({
        block: 'b-employees-combobox',
        modName: 'multi',
        modVal: 'drag'
    }, {

    onSetMod: {

        'js': function() {

            var _this = this;

            this.params = $.extend({
                smallPlaceholder: 'Add'
            }, this.params);

            this.__base();

            this.elem('selected-items').sortable({
                items: 'li:not(.b-employees-combobox__item-input)', //@todo Необходимо получить имя блока от куда-то...
                start: function(event, ui) {
                    _this.findElem('selected-item-position-arrow').hide();
                },
                update: $.proxy(this.afterSorting, this)
            });
        }

    },

    onElemSetMod: {
        input: {
            status: function(input, modName, modVal) {
                input.attr('placeholder', modVal === 'active' ?
                    this.params.activePlaceholder :
                    (['full'].indexOf(this.getMod(this.elem('item-input'), 'style')) !== -1 ?
                        this.params.smallPlaceholder :
                        this.params.defaultPlaceholder
                        )
                );
            }
        }
    },


    _initEvents: function() {
        this.__base();

        this
            .bindTo('item-input', 'mouseover', function() {
                this.setMod(this.elem('item-input'), 'hover', 'yes');
            })
            .bindTo('item-input', 'mouseout', function() {
                this.setMod(this.elem('item-input'), 'hover', 'no');
            });

    },

    afterSorting: function (event, ui) {

        var _this = this,
            values = [];

        this.findElem('selected-item').each(function (index, node) {
            values.push(_this.getSelectedItemId(node));
        });

        this._values = values;

        this._renderValues();

        this.reorderPositions();

        this.trigger('change');
    },

    selectDepartment: function(id) {

        if (true !== this.__base(id)) {
            return false;
        }

        this.reorderPositions();

        return true;
    },

    selectEmployee: function(id) {

        if (true !== this.__base(id)) {
            return false;
        }

        this.reorderPositions();

        return true;
    },

    cancelEmployeeSelected: function(id) {

        this.__base(id);

        this.reorderPositions();
    },

    reorderPositions: function() {
        this.findElem('selected-item-position').each(function (index, node) {
            $(node).text(index + 1);
        });

        this.findElem('selected-item-position-arrow')
            .show()
            .last().hide();
    },

    _updateInputStyle: function() {
        this.setMod(this.elem('item-input'), 'style', !this._values.length && 'default' || 'full');
    },

    getSelectedItemHtml: function(employee, options) {

        var name = employee.fullName;

        return '<li class="b-employees-combobox__selected-item' + ' b-employees-combobox__selected-item_id_' + employee.id + '">' +
            '<div class="b-employees-combobox__selected-item-position">' + options.position + '</div>' +
            '<div class="b-employees-combobox__selected-item-position-arrow">&darr;</div>' +
            '<img src="' + employee.avatarUrl + '" height="18px" width="18px" />' +
            '<span class="b-employees-combobox__selected-item-name" title="' + employee.fullName + '">' + name + '</span>' +
            '<div class="b-employees-combobox__cancel-selected"></div>' +
            '</li>';
    },

    getSelectedDepartmentItemHtml: function(department, options) {
        var cls = 'b-employees-combobox__selected-item';

        return '<li class="' + cls + ' ' + cls + '_type_department ' + cls + '_id-dep_' + department.id + '">' +
            '<div class="' + cls + '-position">' + options.position + '</div>' +
            '<div class="' + cls + '-position-arrow">&darr;</div>' +
            '<span class="' + cls + '-name" title="' + department.name + '">' + department.name + '</span>' +
            '<div class="b-employees-combobox__dep-cancel-selected"></div>' +
            '</li>';

    }

}, {


});