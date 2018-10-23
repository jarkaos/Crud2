'use strict';
var hostWebUrl;
var appWebUrl;
var listName = "Accounts";

ExecuteOrDelayUntilScriptLoaded(initializePage, "sp.js");

function initializePage()
{
    var context = SP.ClientContext.get_current();
    var user = context.get_web().get_currentUser();

    // This code runs when the DOM is ready and creates a context object which is needed to use the SharePoint object model
    $(document).ready(function () {
        PopulateGrid();

        $('#bokningFormSubmit').click(function (e) {
            //Check for edit or new and call update or add function
            if ($('#myModalLabel').html() === 'Ny Bokning') {
                addFile($('#BookningsID').val(), $('#players :selected').text(), $('#BokningsDate').val());
            } else {
                UpdateBokningar($('#bokningId').val());
            }
        });

        $('#updateBokningLabel').on('click', function () {
            updateBokningLabel();
        });

        $('#addNewBokning').on('click', function () {
            addNewBokning();
        });

    });

    function PopulateGrid() {
        //Clear datatables
        $('#BokningsGrid').empty();
        //Get File list items
        $.ajax({
            url: _spPageContextInfo.siteAbsoluteUrl + "/_api/web/Lists/getbytitle('" + listName + "')/items?$select=id, bokningsDate,numberOfPlayers,responsable/Title,BokningsId&$expand=responsable/Title",
            method: "GET",
            headers: {
                "accept": "application/json;odata=verbose"
            },
            success: function (data) {
                if (data.d.results.length > 0) {
                    //construct HTML Table from the JSON Data
                    $('#BokningsGrid').append(GenerateTableFromJson(data.d.results));
                    //Bind the HTML data with Jquery DataTable
                    var oTable = $('#BokningTable').dataTable({
                        //control which datatable options available
                        dom: 'Bfrltip',
                        //add select functionality to datatable
                        select: true,
                        //adjust column widths
                        "columns": [
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            { "width": "8%" }
                        ],
                        //remove sort icon from actions column
                        "aoColumnDefs": [
                            { "bSortable": false, "aTargets": [6] }
                        ]
                    });
                } else {
                    $('#BokningsGrid').append("<span>Inga bokning hittades.</span>");
                }
            },
            error: function (data) {
                $('#BokningsGrid').append("<span>Fel när bokningar hämtades. Fel : " + JSON.stringify(data) + "</span>");
            }
        });
    };

    //Generate html table values
    function GenerateTableFromJson(objArray) {
        
        var tableContent =
            '<table id="BokningTable" class="table table-striped table-bordered" cellspacing="0" width="100%">' +
            '<thead><tr>' + '<th>ID</th>' + '<th>BookningID</th>' +'<th>Ansvarig</th>' + '<th>AntalSpelare</th>' + '<th>BokningsDate</th>' + '<th>Actions</th>' + '</tr></thead>';
        for (var i = 0; i < objArray.length; i++) {
            var bookningId = objArray[i].BokningsId;

            if (bookningId === null) {
                bookningId = '';
            }

            var id = objArray[i].Id;
            var ansvarig = objArray[i].responsable.Title;
            var BokningsDate = moment(objArray[i].bokningsDate).format("YYYY-MM-DD");
            var numberOfPlayers = objArray[i].numberOfPlayers;

            tableContent += '<tr>';
            tableContent += '<td>' + id + '</td>';
            tableContent += '<td>' + bookningId + '</td>';
            tableContent += '<td>' + ansvarig + '</td>';
            tableContent += '<td>' + numberOfPlayers + '</td>';
            tableContent += '<td>' + BokningsDate + '</td>';
            tableContent += "<td><a id='" + objArray[i].Id + "' href='#' style='color: orange' class='confirmEditBokningLink'>" +
                "<i class='glyphicon glyphicon-pencil' title='Redigera bokning'></i></a>&nbsp&nbsp";
            tableContent += "<a id='" + objArray[i].Id + "' href='#' style='color: red' class='confirmDeleteBokningLink'>" +
                "<i class='glyphicon glyphicon-remove' title='Ta bort bokning'></i></a>&nbsp&nbsp";
            tableContent += "<a id='" + objArray[i].Id + "' href='#' class='confirmListBokningDetailsLink'>" +
                "<i class='glyphicon glyphicon-cog' title='Länk till bokning information'></i></a></td>";
            tableContent += '</tr>';
        }
        return tableContent;
    };

    // Edit button click event
    $(document).on('click', '.confirmEditBokningLink', function (e) {
        e.preventDefault();
        var id = this.id;

        $.ajax({
            url: _spPageContextInfo.siteAbsoluteUrl + "/_api/web/Lists/getbytitle('" + listName + "')/items(" + id + ")?$select=id,bokningsDate,numberOfPlayers,responsable/Title,BokningsId&$expand=responsable/Title",
            method: "GET",
            contentType: "application/json;odata=verbose",
            headers: { "accept": "application/json;odata=verbose" },
            success: function (data) {
                console.log('success');
                $('#Ansvarig').val(data.d.responsable.Title);
                $('#BokningsDate').val(data.d.bokningsDate);
                $('#players').val(data.d.numberOfPlayers);
                $('#BookningsID').val(data.d.BokningsId);
                $('#bokningId').val(data.d.Id);
                $('#myModalLabel').html('Redigera Bokning');
                $('#myModalNorm').modal('show');
                $("#etag").val(data.d.__metadata.etag);
            }
        });
    });
     
    //Link to files list item
    $(document).on('click', '.confirmListBokningDetailsLink', function (e) {
        e.preventDefault();
        var id = this.id;
        window.location.href = _spPageContextInfo.siteAbsoluteUrl + "/Lists/" + listName + "/DispForm.aspx?ID=" + id;
    });

    // Delete button click event
    $(document).on('click', '.confirmDeleteBokningLink', function (e) {
        e.preventDefault();
        var id = this.id;
        BootstrapDialog.show({
            size: BootstrapDialog.SIZE_SMALL,
            type: BootstrapDialog.TYPE_DANGER,
            title: "Bekräftelse",
            message: "Vill du ta bort denna bokning?",
            buttons: [
                {
                    label: "Bekräfta",
                    cssClass: 'btn-primary',
                    action: function (dialog) {
                        dialog.close();
                        var restUrl = _spPageContextInfo.siteAbsoluteUrl + "/_api/web/lists/getbytitle('" + listName + "')/items(" + id + ")";
                        jQuery.ajax({
                            url: restUrl,
                            type: "DELETE",
                            headers: {
                                Accept: "application/json;odata=verbose",
                                "X-RequestDigest": $("#__REQUESTDIGEST").val(),
                                "IF-MATCH": "*"
                            }
                        });
                        toastr.success("Bokning togs bort. Ladda om sida!", "Klart!");
                        PopulateGrid();
                    }
                },
                {
                    label: "Avbryt",
                    action: function (dialog) {
                        dialog.close();
                    }
                }
            ]
        });
    });

    //Update Model Label
    function updateBokningLabel() {
        $('#myModalLabel').html('Ny Bokning');
    };

    //Populate then display model dialog for add file button clicked
    function addNewBokning() {
        $('#myModalLabel').html('Ny Bokning');
        $('#BokningsDate').val('');
        $("#BookningsID").val();
        $('#players :selected').text();
        $('#myModalNorm').modal('show');
    };

    //Edit file function
    function UpdateBokningar(id) {
        var BookningsID = $("#BookningsID").val();
        var AntalSpelare = $('#players :selected').text();
        var BokningsDate = $("#BokningsDate").val();
        var eTag = $("#etag").val();

        /**
        * Aqui guardo el bookningsID que escribe el usuario en formato 1234567890 en la variable numSplit 
        * y le digo que se prepare para agregar un '-' */
        var numSplit = BookningsID.split('-');

        /* la variable int ubica el primer numero y lo guarda */
        var int = numSplit[0];

        /*
         * controlo que el numero tenga al menos 10 sifras 
         * */
        if (int.length >= 10) {
            // cuento cuatro sifras desde la izquierda y agrego un '-' y despues agrego los cuatro numeros restantes
            int = int.substring(0, int.length - 4) + '-' + int.substring(int.length - 4, 10);
        }

        /* controlo nuevamente que el ususario haya en realidad escrito un numero de reservacion, 
         * si no lo ha hecho lo dejo en blanco, de lo contrario la lista mostrara 'null' 
         */
        if (int === null || int === '') {
            int = '';
        }
        /* Termina la validacion */


        var requestUri = _spPageContextInfo.siteAbsoluteUrl + "/_api/web/lists/getbytitle('" + listName + "')/items(" + id + ")";
        console.info("requestUri: " + requestUri);
        var requestHeaders = {
            "accept": "application/json;odata=verbose",
            "X-HTTP-Method": "MERGE",
            "X-RequestDigest": $('#__REQUESTDIGEST').val(),
            "If-Match": eTag
        };
        var fileData = {
            __metadata: { "type": "SP.Data.AccountsListItem" },
            BokningsId: int, // esta variable contiene el numero en formato 123456-7890 y lo guarda en la lista
            bokningsDate: BokningsDate,
            numberOfPlayers: AntalSpelare
        };
        
        var requestBody = JSON.stringify(fileData);

        return $.ajax({
            url: requestUri,
            type: "POST",
            contentType: "application/json;odata=verbose",
            headers: requestHeaders,
            data: requestBody
        });
    }

    //Add File function
    var addFile = function (BookningsID, AntalSpelare, bokningsDate) {

        /**
         * Aqui guardo el bookningsID que escribe el usuario en formato 1234567890 en la variable numSplit 
         * y le digo que se prepare para agregar un '-' */
        var numSplit = BookningsID.split('-');

        /* la variable int ubica el primer numero y lo guarda */
        var int = numSplit[0];

        /*
         * controlo que el numero tenga al menos 10 sifras 
         * */
        if (int.length >= 10) {
            // cuento cuatro sifras desde la izquierda y agrego un '-' y despues agrego los cuatro numeros restantes
            int = int.substring(0, int.length - 4) + '-' + int.substring(int.length - 4, 10);
        }

        /* controlo nuevamente que el ususario haya en realidad escrito un numero de reservacion, 
         * si no lo ha hecho lo dejo en blanco, de lo contrario la lista mostrara 'null' 
         */
        if (int === null || int === '') {
            int = '';
        }
        /* Termina la validacion */


        var requestUri = _spPageContextInfo.siteAbsoluteUrl + "/_api/web/lists/getByTitle('" + listName + "')/items";
        var requestHeaders = {
            "accept": "application/json;odata=verbose",
            "content-type": "application/json;odata=verbose",
            "X-RequestDigest": $('#__REQUESTDIGEST').val()
        };
        var fileData = {
            __metadata: { "type": "SP.Data.AccountsListItem" },
            BokningsId: int, // esta variable contiene el numero en formato 123456-7890 y lo guarda en la lista
            bokningsDate: bokningsDate,
            numberOfPlayers: AntalSpelare
        };
        console.table(fileData);
        var requestBody = JSON.stringify(fileData);
        return $.ajax({
            url: requestUri,
            type: "POST",
            headers: requestHeaders,
            data: requestBody
        });

    };

   
}
