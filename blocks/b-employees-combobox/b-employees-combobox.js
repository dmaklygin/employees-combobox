BEM.DOM.decl('b-employees-combobox', {

    onSetMod: {

        'js': function() {
            this._data = this.params.data;
            var employees = this._employees = [],
                _this = this;

            $.each(this._data, function(nc, company) {
                $.each(company.departments, function(nd, dep) {
                    $.each(dep.employees, function(ne, emp) { employees.push(emp) });
                });
            });

            this._input = this.elem('input');
            this._suggest = this.elem('suggest');
            this._val = this._input.val();
            this._current = 0;
            this._currentCompany = this._data[0].id;

            this._preventHide = false;

            this.on('change', this._refreshSuggest);

            this
                .bindTo(this._input, 'blur', function() {
                      this.afterCurrentEvent(function() { _this._hideSuggest() });
                })

                .bindTo(this._input, 'keypress', function(e) {
                    if (e.keyCode == 13) {
                        _this._selectEmployee(_this.getMod(_this.findElem('employee', 'select', 'yes'), 'id'));
                        _this._hideSuggest();
                    }
                })

                .bindTo(this._input, 'keydown', function(e) {
                    switch (e.keyCode)
                    {
                        case 40:
                            _this._moveCursor('down');
                            break;
                        case 38:
                            _this._moveCursor('up');
                            break;
                        default:
                            this._showSuggest();
                    }
                });

            setInterval(function() { _this.inputVal(_this._input.val()) }, 200);
            this._refreshSuggest();
        }

    },

    _scrollToCurrent: function(current) {
        current || (current = this.findElem('employee').eq(this._current));
        current.length && this._suggest.scrollTop(current.position().top + this._suggest.scrollTop());
    },

    _showSuggest: function(scrollOff) {
        this.elem('dropdown').fadeIn(200, !scrollOff && this._scrollToCurrent());
        this.setMod(this.elem('matched-counter'), 'show', 'yes');
    },

    _hideSuggest: function() {
        if (this._preventHide) {
            this._preventHide = false;
            this._focus();
        } else {
            this.elem('dropdown').fadeOut(200);
            this.setMod(this.elem('matched-counter'), 'show', 'no');
        }
    },

    _selectEmployee: function(id) {
        if (!id) return;

        var emp = this._getEmployeeById(id);

        if (!emp) return;

        this._input.val(emp.fullName);
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

        var next = items.eq(this._current);
        var nextDep = next.parent().parent();

        // поиск не схлопнутого отдела для активного пункта
        if (this.hasMod(nextDep, 'expand', 'off')) {
            var deps = $('.b-employees-combobox__department', nextDep.parent());
            var counter = nextDep.index();

            do {
                counter = direction == 'down' ?
                    counter == deps.length - 1 ? 0 : counter + 1 :
                    counter == 0 ? deps.length - 1 : counter - 1;
            } while (this.hasMod(deps.eq(counter), 'expand', 'off') && counter != nextDep.index())

            var nextDepChild = $('.b-employees-combobox__employees-list', deps.eq(counter)).children();
            next = direction == 'down' ? nextDepChild.first() : nextDepChild.last();
            for (var i = 0, l = items.length; i < l; i++) {
                if (next[0] == items[i]) {
                    this._current = i;
                    break;
                }
            }
        } else {
            this._scrollToCurrent(next);
        }

        this.setMod(next, 'select', 'yes');
    },

    // TODO use templates
    _getCompaniesHtml: function(list) {
        var htmlBuf = '',
            cmpCls = 'b-employees-combobox__company';

        $.each(list, function(nc, company) {
            htmlBuf += '<li class="' + cmpCls + ' ' + cmpCls + '_id_' + company.id + '">' + company.name + '</li>';
        });

        return htmlBuf;
    },

    // TODO use templates
    _getSuggestHtml: function(company) {
        var empCls = 'b-employees-combobox__employee';

        if (!company) return 'Нет совпадений';

        var htmlBuf = '<ul class="b-employees-combobox__departments-list">';

        $.each(company.departments, function(nd, dep) {

            if (!dep.employees) return;

            htmlBuf += '<li class="b-employees-combobox__department b-employees-combobox__department_expand_on">' +
                '<div class="b-employees-combobox__department-name">' + dep.name + '</div>' +
                '<ul class="b-employees-combobox__employees-list">';

            $.each(dep.employees, function(ne, emp) {
                htmlBuf += '<li class="' + empCls + ' ' +
                    (ne === 0 && nd === 0 ? empCls + '_select_yes ' : '') + empCls + '_id_' + emp.id + '">' + emp.fullName + '</li>';
            });
            htmlBuf += '</ul></li>';
        });
        htmlBuf += '</ul></li>';

        return htmlBuf + '</ul>';
    },

    _refreshSuggest: function() {
        var matched = this._getMatchedEmployee(),
            count = 0,
            company;

        $.each(matched, function(nc, company) {
            $.each(company.departments, function(nd, dep) {
                count += dep.employees.length;
            });
        });

        for (var i = 0, l = matched.length; i < l; i++) {
            if (matched[i].id == this._currentCompany) {
                company = matched[i];
                break;
            }
        }

        BEM.DOM.update(this.elem('companies'), this._getCompaniesHtml(this._data));
        BEM.DOM.update(this._suggest, this._getSuggestHtml(company));
        BEM.DOM.update(this.elem('matched-counter'), count + '');
    },

    _getMatchedEmployee: function() {

        if (!this._val.length) return this._data;

        var res = [],
            _this = this,
            val = _this._val.toLowerCase();

        $.each(this._data, function(nc, company) {
            var matchedDepartments = [];

            $.each(company.departments, function(nd, dep) {
                var matchedEmployees = [];

                $.each(dep.employees, function(ne, emp) {
                    var name = emp.fullName.toLowerCase(),
                        words = name.split(' '),
                        matchFlag = false;

                    words.push(name);
                    words.forEach(function(w) {
                        w.indexOf(val) || (matchFlag = true)
                    });

                    matchFlag && matchedEmployees.push(emp);
                });

                matchedEmployees.length && matchedDepartments.push({
                    name: dep.name,
                    id: dep.id,
                    employees: matchedEmployees
                });
            });

            matchedDepartments.length && res.push({
                name: company.name,
                id: company.id,
                departments: matchedDepartments
            });
        });

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

        return null;
    },

    _focus: function() {

        var input = this.elem('input')[0];
        if (input.createTextRange && !input.selectionStart) {
            var range = input.createTextRange();
            range.move('character', input.value.length);
            range.select();
        } else {
            input.focus();
        }

    }

},
{
   live: function() {
       this
           .liveBindTo('input', 'focusin', function() {
               this._showSuggest(true);
           })

           .liveBindTo('employee', 'mousedown', function(e) {
               this._selectEmployee(this.getMod(e.data.domElem, 'id'));
           })

           .liveBindTo('department-name', 'mousedown', function(e) {
               this._preventHide = true;

               var depDom = e.data.domElem.parent(),
                   hasSelected = $('.b-employees-combobox__employee_select_yes', depDom).length;

               this.toggleMod(depDom, 'expand', 'on', 'off');
               $('.b-employees-combobox__employees-list', depDom).slideToggle(200, hasSelected && function() {
                   this._scrollToCurrent();
               }.bind(this));
               hasSelected && this._moveCursor('down');
           })

           .liveBindTo('company', 'mousedown', function(e) {
               this._preventHide = true;

               this._currentCompany = this.getMod(e.data.domElem, 'id');
               this._refreshSuggest();
           })
   }
});
