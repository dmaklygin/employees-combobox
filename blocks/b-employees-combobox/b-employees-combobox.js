BEM.DOM.decl('b-employees-combobox', {

    onSetMod: {

        'js': function() {

            this.params = $.extend({
                defaultPlaceholder: 'Initiator',
                activePlaceholder: 'Search'
            }, this.params);

            this._data = this.params.data;

            var employees = this._employees = [],
                departments = this._departments = [],
                _this = this;

            $.each(this._data, function(nc, company) {
                $.each(company.departments, function(nd, dep) {
                    departments.push(dep);
                    $.each(dep.employees, function(ne, emp) { employees.push(emp) });
                });
            });

            this._input = this.elem('input');

            this.setMod(this._input, 'status', 'inactive');

            this._suggest = this.elem('suggest');

            this._isMulti = this.hasMod('multi');

            this._values = this._input.val().split(',').filter(function(val) { return !!val; });

            this._departmentsValues = [];

            this._val = this._input.val();

            this._current = 0;

            this._currentCompanyId = this._data[0].id;

            this._preventHide = false;

            this._initEvents();

            // @todo зачем интервал здесь?
            setInterval(function() { _this.inputVal(_this._input.val()) }, 200);

            this._refreshSuggest();
        }

    },

    onElemSetMod: {
        input: {
            status: function(input, modName, modVal) {
                input.attr('placeholder', modVal === 'active' ?
                    this.params.activePlaceholder :
                    this.params.defaultPlaceholder)
            }
        }
    },

    _initEvents: function() {

        var _this = this;

        this.on('change', function() {

            // update input style
            _this._updateInputStyle();

            // refresh Suggest
            _this._refreshSuggest();
        });

        this
            .bindTo('input', 'focusin', function() {
                this.setMod(this.elem('input'), 'status', 'active');
                this._showSuggest(true);
            })
            .bindTo(this._input, 'blur', function() {
                this.setMod(this.elem('input'), 'status', 'inactive');
                this.afterCurrentEvent(function() { _this._hideSuggest() });
            })

            .bindTo('dropdown', 'mousedown', function() {
                this._preventHide = true;
            })

            .bindTo(this._input, 'keypress', function(e) {
                if (e.keyCode == 13) {
                    _this.selectEmployee(_this.getMod(_this.findElem('employee', 'select', 'yes'), 'id'));
                    _this._isMulti && _this._input.focus();
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
                    case 27:
                        _this._reset();
                        break;
                    default:
                        this._showSuggest();
                }
            });


    },

    _scrollToCurrent: function(current) {
        current || (current = this.findElem('employee').eq(this._current));

        if (current.length) {
            this.__scroller.scrollbar({
                scrollTo: this.__scroller.data('scrollbar').content.scrollTop() + current.position().top - 25
            });
        }
    },

    _showSuggest: function(scrollOff) {

        var _this = this,
            position = this.elem('item-input').position(),
            height = this.elem('item-input').outerHeight(true);

        this.setMod(this.elem('item-input'), 'selected', 'yes');

        this.elem('dropdown')
            .css({ top: (position.top + height) + 'px' })
            .fadeIn(200, function () {

                _this.__scroller && _this._suggest.scrollbar();

                !scrollOff && _this._scrollToCurrent();
            });
    },

    _hideSuggest: function() {
        if (this._preventHide) {
            this._preventHide = false;
            this.elem('input').focus();
        } else {

            this.setMod(this.elem('item-input'), 'selected', 'no');

            this.elem('dropdown').fadeOut(200);
        }
    },

    _renderValues: function() {

        var values = [];

        this.elem('value').val(this._values.join(','));
    },

    selectDepartment: function(id) {

        if (!id) return false;

        id = id.toString();

        if (-1 === this._values.indexOf(id + 'd'))
            this._values.push(id + 'd');
        else
            return false;

        var _this = this,
            repeatingEmployeesIds = [];

        $.each(this._data, function(nc, company) {
            if (company.id != _this._currentCompanyId) {
                return;
            }
            $.each(company.departments, function(nc, department) {
                if (_this._values.indexOf(department.id.toString() + 'd') !== -1) {

                    var employees = $.map(department.employees, function(employee) {
                        return employee.id.toString();
                    });

                    $.each(employees, function(nc, employeeId) {
                        var employeePos = _this._values.indexOf(employeeId + 'e');

                        if (employeePos !== -1) {

                            repeatingEmployeesIds.push(employeeId);

                            _this._values.splice(employeePos, 1);
                        }
                    });
                }
            });
        });

        repeatingEmployeesIds.length && $.each(repeatingEmployeesIds, function(nc, employeeId) {
            _this.findElem('selected-item', 'id', employeeId).remove();
        });

        this._renderValues();

        this.elem('input').val('');

        this.params.onSelect && this.params.onSelect(id, 'department');

        $(this.__self.getSelectedDepartmentItemHtml(this._getDepartmentById(id), {
            isMulti: this._isMulti,
            position: this._values.length
        }))
            .insertBefore(this.elem('item-input'));

        this.trigger('change');

        return true;
    },

    selectEmployee: function(id) {
        if (!id) return false;

        var _this = this,
            emp = this._getEmployeeById(id);

        if (!emp) return false;

        if (this._isMulti) {
            if (-1 === this._values.indexOf(id + 'e'))
                this._values.push(id + 'e');
            else
                return false;
        } else {
            this._values = [id + 'e'];
        }

        this._renderValues();

        this.elem('input').val('');

        this.params.onSelect && this.params.onSelect(id, 'employee');

        $(this.__self.getSelectedItemHtml(emp, {
                isMulti: this._isMulti,
                position: this._values.length
            }))
            .insertBefore(this.elem('item-input'));

        this._isMulti || this.elem('item-input').hide();

        this._isMulti || this._hideSuggest();

        this.trigger('change');

        return true;
    },

    _removeEmployee: function(id) {

        if (this._isMulti) {
            this._values = this._values.filter(function (item) { return item != id + 'e' });
        } else {
            this._values = [];
        }

        this._renderValues();

        this.trigger('change');
    },

    cancelEmployeeSelected: function(id) {

        this._removeEmployee(id);

        this.findElem('selected-item', 'id', id).remove();

        if (!this._isMulti) {
            this.elem('item-input').show();
        }

        this._preventHide = true;

        this.elem('input').focus();
    },

    cancelDepartmentSelected: function(id) {

        this._values = this._values.filter(function (item) { return item != id + 'd' });

        this._renderValues();

        this.trigger('change');

        this.findElem('selected-item', 'id-dep', id).remove();

        this.elem('item-input').show();

        this._preventHide = true;

        this.elem('input').focus();
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

    _refreshSuggest: function() {
        var _this = this,
            matched = this._getMatchedEmployee(),
            activeCompany = null,
            company;

        $.each(matched, function(nc, company) {
            if (company.id == _this._currentCompanyId && company.cnt > 0) {
                activeCompany = _this._currentCompanyId;
                return false;
            }
        });

        activeCompany || $.each(matched, function(nc, company) {
            if (company.cnt > 0) {
                activeCompany = company.id;
                return false;
            }
        });

        this._currentCompanyId = activeCompany || this._currentCompanyId;

        for (var i = 0, l = matched.length; i < l; i++) {
            if (matched[i].id == this._currentCompanyId) {
                company = matched[i];
                break;
            }
        }

        this._current = 0;

        BEM.DOM.update(this.elem('companies'), this.__self.getCompaniesHtml(matched, this._currentCompanyId));
        BEM.DOM.update(this._suggest, this.__self.getSuggestHtml(company, {
            name: this._val,
            selectedValues: this._values,
            isMulti: this._isMulti
        }));

        _this.__scroller = _this._suggest.scrollbar({ forceUpdate: true });
    },

    /**
     * [
     *   company
     *          ->
     * ]
     * @return {*}
     * @private
     */
    _getMatchedEmployee: function() {

        var res = [],
            _this = this,
            val = _this._val && _this._val.toLowerCase();

        $.each(this._data, function(nc, company) {
            var matchedDepartments = [],
                cntEmployees = 0;
            $.each(company.departments, function(nd, dep) {
                var matchedEmployees = [];
                if (_this._values.indexOf(dep.id + 'd') !== -1) {
                    return;
                }
                $.each(dep.employees, function(ne, emp) {
                    if (_this._values.indexOf(emp.id + 'e') !== -1) {
                        return;
                    }
                    var name = emp.fullName.toLowerCase(),
                        words = name.split(' '),
                        matchFlag = false;

                    if (val) {
                        words.push(name);
                        words.forEach(function(w) {
                            w.indexOf(val) || (matchFlag = true)
                        });

                    } else {
                        matchFlag = true;
                    }

                    matchFlag && matchedEmployees.push(emp);
                });

                cntEmployees += matchedEmployees.length;

                matchedEmployees.length && matchedDepartments.push({
                    name: dep.name,
                    id: dep.id,
                    employees: matchedEmployees
                });
            });

            res.push({
                name: company.name,
                id: company.id,
                departments: matchedDepartments,
                cnt: cntEmployees
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

    _getDepartmentById: function(id) {
        var data = this._departments,
            department = null;
        $.each(data, function(nc, dep) {
            if (dep.id == id) department = dep;
        });

        return department;
    },

    _focus: function() {

        var input = this.elem('input')[0];
        if (input.createTextRange && !input.selectionStart) {
            var range = input.createTextRange();
            range.move('character', input.value.length)
            range.select();
        } else {
            input.focus();
        }

    },

    _reset: function() {

        this._values = [];

        this.elem('value').val('');

        this.findElem('selected-item').remove();

        this._hideSuggest();

        this.findElem('input').blur();

        this.trigger('change');
    },

    _updateInputStyle: function() {

    },

    getSelectedItemId: function(node) {

        var id = this.getMod($(node), 'id');

        if (!id) {
            id = this.getMod($(node), 'id-dep');

            if (!id) {
                return null;
            }
            return id + 'd';
        }

        return id + 'e';
    }

},
{
   live: function() {
       this
            .liveBindTo('employee', 'mousedown', function(e) {
               this.selectEmployee(this.getMod(e.data.domElem, 'id'));
           })

           .liveBindTo('department-name', 'mousedown', function(e) {
               var depDom = e.data.domElem.parent(),
                   hasSelected = $('.b-employees-combobox__employee_select_yes', depDom).length;

               if (this._isMulti) {
                    this.selectDepartment(this.getMod(depDom, 'id'));
                    return;
               }

               this.toggleMod(depDom, 'expand', 'on', 'off');

               $('.b-employees-combobox__employees-list', depDom).slideToggle(200, function() {

                   // update scroller
                   this.__scroller.scrollbar();

                   hasSelected && this._scrollToCurrent();
               }.bind(this));

               hasSelected && this._moveCursor('down');
           })

           .liveBindTo('company', 'mousedown', function(e) {
               this._currentCompanyId = this.getMod(e.data.domElem, 'id');
               this._refreshSuggest();
           })

           .liveBindTo('cancel-selected', 'mousedown', function(e) {
               this.cancelEmployeeSelected(this.getMod(e.data.domElem.parent(), 'id'));
           })

           .liveBindTo('dep-cancel-selected', 'mousedown', function(e) {
               this.cancelDepartmentSelected(this.getMod(e.data.domElem.parent(), 'id-dep'));
           });

       return false;
   },

    // TODO use templates
    getCompaniesHtml: function(list, cidCurrent) {
        var htmlBuf = '',
            cls = 'b-employees-combobox__company';

        $.each(list, function(nc, company) {

            htmlBuf +=
                '<li class="' + cls + ' ' + cls + '_id_' + company.id + (cidCurrent == company.id ? ' ' + cls + '_select_yes' : '') + '">' +
                    '<span class="b-employees-combobox__company-matched">' + company.cnt + '</span>' +
                    '<span class="b-employees-combobox__company-name">' + company.name + '</span>' +
                    '<i class="b-employees-combobox__arrow"></i>' +
                '</li>';
        });

        return htmlBuf;
    },

    // TODO use templates
    getSuggestHtml: function(company, options) {

        var empCls = 'b-employees-combobox__employee';

        if (!company || !company.departments.length) {
            return '<div class="b-employees-combobox__not-found">' +
                'По запросу ' +
                '<span  class="b-employees-combobox__search-string">&laquo;' +
                options.name + '&raquo;</span>' +
                ' поиск не дал результатов' +
                '</div>';
        }

        var htmlBuf = '<ul class="b-employees-combobox__departments-list content">';

        $.each(company.departments, function(nd, dep) {

            if (!dep.employees) return;

            var depCls = 'b-employees-combobox__department';

            htmlBuf +=
                '<li class="' + depCls + ' ' + depCls + '_expand_on ' + depCls + '_id_' + dep.id + '">' +
                    '<div class="b-employees-combobox__department-name">' + dep.name + '</div>' +
                        '<ul class="b-employees-combobox__employees-list">';

            $.each(dep.employees, function(ne, emp) {

                var name = emp.fullName;

                if (options.name) {

                    var optionsName = options.name.toLowerCase(),
                        upperFirstLetters = function (text) {
                        return text
                            .split(' ')
                            .map(function (word, index) {
                                return word.substr(0, 1).toUpperCase() + word.substr(1);
                            })
                            .join(' ')
                    };

                    name = name
                        .toLowerCase()
                        .split(optionsName)
                        .map(function (word, index) {
                            return index == 0 ?
                                (word.length ?
                                    upperFirstLetters(word) + '<strong>' + optionsName + '</strong>' :
                                    '<strong>' + upperFirstLetters(optionsName) + '</strong>'
                                ) :
                                word;
                        })
                        .join('');
                }

                htmlBuf +=
                    '<li class="' + empCls + ' ' + (ne === 0 && nd === 0 ? empCls + '_select_yes ' : '') + empCls + '_id_' + emp.id + '">' +
                        '<img src="' + emp.avatarUrl + '" height="32px" width="32px" />' +
                        '<div class="b-employees-combobox__employee-info">' +
                            '<div class="b-employees-combobox__employee-name">' + name + '</div>' +
                            '<div class="b-employees-combobox__employee-pos" title="' + emp.position + '">' + emp.position + '</div>' +
                        '</div>' +
                    '</li>';
            });
            htmlBuf += '</ul></li>';
        });
        htmlBuf += '</ul></li>';

        return htmlBuf + '</ul>';
    },

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
            '<img src="' + employee.avatarUrl + '" height="18px" width="18px" />' +
            '<span class="b-employees-combobox__selected-item-name" title="' + employee.fullName + '">' + name + '</span>' +
            '<div class="b-employees-combobox__cancel-selected"></div>' +
        '</li>';
    },

    getSelectedDepartmentItemHtml: function(department, options) {
        var cls = 'b-employees-combobox__selected-item';

        return '<li class="' + cls + ' ' + cls + '_type_department ' + cls + '_id-dep_' + department.id + '">' +
                '<span class="' + cls + '-name" title="' + department.name + '">' + department.name + '</span>' +
                '<div class="b-employees-combobox__dep-cancel-selected"></div>' +
            '</li>';

    }
});
