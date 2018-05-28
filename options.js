window.$dt = $('#data-table');

class CensorEdit {
    static bind() {
        let dt = window.dataTable;

        $dt.find('tbody').on('click', 'tr', function () {
            let data = dt.row(this).data();

            if (data) {
                CensorEdit.beginEdit(data);
            }
        });

        $('#props-new').click((e) => {
            e.preventDefault();
            CensorEdit.beginEdit(null);
            return false;
        });

        $('#props-save').click((e) => {
            e.preventDefault();
            CensorEdit.saveEdit();
            return false;
        });

        $('#props-cancel').click((e) => {
            e.preventDefault();
            CensorEdit.endEdit();
            return false;
        });

        $('#props-del').click((e) => {
            e.preventDefault();
            CensorEdit.endEdit();
            return false;
        });

        CensorEdit.endEdit();
    }

    static beginEdit(data) {
        if (!data) {
            data = { key: null, selectors: "", sites: "" };
        }

        CensorEdit.data = data;
        CensorEdit.isEditMode = !!data.key;

        CensorEdit.syncPropEdit();

        $('.options-tab--props').show();
        $('.options-tab--manager').hide();
    }

    static saveEdit() {
        CensorEdit.data.selectors = $('#txt-prop-selectors').val();
        CensorEdit.data.sites = $('#txt-prop-sites').val();

        CensorDb.addOrUpdateRule(CensorEdit.data)
            .then((key) => {
                console.log(`[Streamer Mode] Added or updated db record: ${(key || "???").toString()}`);
            })
            .catch((err) => {
                console.error(`[Streamer Mode] Error saving record: ${err.toString()}`);
            })
            .then(() => {
                CensorEdit.endEdit();
            });
    }

    static endEdit() {
        $('.options-tab--props').hide();
        $('.options-tab--manager').show();

        CensorDb.getAllRules()
            .then((objs) => {
                dataTable.clear();

                for (let key in objs) {
                    if (objs.hasOwnProperty(key)) {
                        let obj = objs[key];
                        obj.key = parseInt(key);

                        if (isNaN(obj.key)) {
                            obj.key = undefined;
                        }

                        console.log('list', key, obj);

                        dataTable.row.add(obj);
                    }
                }

                dataTable.draw();

            })
            .catch((err) => {
                console.error(`[Streamer Mode] Error saving record: ${err.toString()}`);
            })
    }

    static syncPropEdit() {
        $('#txt-prop-selectors').val(this.data.selectors || "");
        $('#txt-prop-sites').val(this.data.sites || "");

        if (CensorEdit.isEditMode) {
            $('#props-del').show();
        } else {
            $('#props-del').hide();
        }
    }
}

window.dataTable = $dt.DataTable( {
    data: [],
    columns: [
        { data: 'selectors' },
        { data: 'sites' }
    ],
    "bLengthChange": false,
    language: {searchPlaceholder: "Type to search for filters..."}
});

CensorEdit.bind();