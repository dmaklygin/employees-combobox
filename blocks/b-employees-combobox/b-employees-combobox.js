
BEM.DOM.decl('b-employees-combobox', {

    onSetMod: {

        'js': function() {

            setInterval(function() { this.inputVal(this._input.val()) }.bind(this), 200)

            this._employees = this.params.employees;
            this._input = this.elem('input');
            this._suggest = this.elem('suggest');
            this._list = this.elem('employees-list');
            this._val = this._input.val();
            this._current = 0;
            this._selected = [];

            this.on('change', function() {
                BEM.DOM.update(this._list, this._getEmployeeListDom(this._getMatchedEmployee()))
            });

            this
                .bindTo(this._input, 'blur', function() {
                    this.setMod(this._suggest, 'show', 'no');
                }.bind(this))

                .bindTo(this._input, 'keypress', function(e) {
                    if (e.keyCode == 13) { this._selectCurrentItem() }
                }.bind(this))

                .bindTo(this._input, 'keydown', function(e) {
                    switch (e.keyCode)
                    {
                        case 40:
                            this._moveCursor('down');
                            break;
                        case 38:
                            this._moveCursor('up');
                            break;
                        default:
                            this.setMod(this._suggest, 'show', 'yes');
                    }
                }.bind(this));
        }

    },

    _selectCurrentItem: function() {
        var current = this.findElem('employee', 'select', 'yes');

        if (!current) return;

        var emp = this._getEmployeeById(this.getMod(current, 'id'));

        if (!emp) return;

        this._selected.push(emp)
        this._input.val(emp.name);
        this.setMod(this._suggest, 'show', 'no')
    },

    _moveCursor: function(direction) {
        var items = this.findElem('employee'),
            current = this._current,
            length = items.length;

        if (length <= 1) return;

        this.setMod(items.eq(current), 'select', 'no');
        this._current = direction == 'down' ?
            current == length - 1 ? 0 : current + 1 :
            current == 0 ? length - 1 : current - 1;

        this.setMod(items.eq(this._current), 'select', 'yes');
    },

    _getEmployeeListDom: function(list) {
        var cls = 'b-employees-combobox__employee';

        return $.map(list, function(v, i) {
            return '<li class="' + cls + ' ' +
                (i === 0 ? cls + '_select_yes ' : '') + cls + '_id_' + v.id + '">' + v.name + '</li>';
        });
    },

    _getMatchedEmployee: function() {
        var res = [];

        $.each(this._employees, function(i, v) {
            v.name.toLowerCase().indexOf(this._val.toLowerCase()) || res.push(v);
        }.bind(this))

        this._current = 0;

        return res;
    },

    inputVal: function(val) {

        if (typeof val == 'undefined') return this._val;

        if (this._val != val) {
            this._input.val() != val && this._input.val(val);
            this._val = val;
            this.trigger('change');
        }

        return this;
    },

    _getEmployeeById: function(id) {
        var data = this._employees;

        for (var i = 0, l = data.length; i < l; i++) {
            if (data[i].id == id) return data[i];
        }
    }

},
{
   live: function() {
       this.liveBindTo('input', 'focusin', function() {
           BEM.DOM.update(this._list, this._getEmployeeListDom(this._getMatchedEmployee()));
           this.setMod(this._suggest, 'show', 'yes')
       });
   }
});
