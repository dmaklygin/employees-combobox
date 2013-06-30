BEM.DOM.decl({
        block: 'b-employees-combobox',
        modName: 'multi',
        modVal: 'drag'
    }, {

    onSetMod: {

        'js': function() {

            var _this = this;

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

    afterSorting: function (event, ui) {

        var _this = this,
            values = [];

        this.findElem('selected-item').each(function (index, node) {
            values.push(_this.getSelectedItemId(node));
        });

        this._values = values;

        this.elem('value').val(this._values.join(','));

        this.reorderPositions();

        this.trigger('change');
    },

    selectEmployee: function(id) {

        if (true !== this.__base(id)) {
            return false;
        }

        this.reorderPositions();

        return true;
    },

    cancelSelected: function(id) {

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
    }

}, {
    // TODO use templates
    getSelectedItemHtml: function(employee, options) {

        var name = employee.fullName;

        if (options.isMulti) {
            name = [
                employee.name.substr(0, 1),
                employee.surname
            ].join('. ')
        }

        return '<li class="b-employees-combobox__selected-item' + ' b-employees-combobox__selected-item_id_' + employee.id + '">' +
            '<div class="b-employees-combobox__selected-item-position">' + options.position + '</div>' +
            '<div class="b-employees-combobox__selected-item-position-arrow">&darr;</div>' +
            '<img src="' + employee.avatarUrl + '" height="18px" width="18px" />' +
            '<span class="b-employees-combobox__selected-item-name">' + name + '</span>' +
            '<div class="b-employees-combobox__cancel-selected"></div>' +
            '</li>';
    }
});