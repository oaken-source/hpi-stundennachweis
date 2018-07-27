
$(function() {
  $('#form-data').submit(std.submitForm);
  $('#form-start').val(new Date().getMonth());
  $('#year').text(new Date().getFullYear());
});

var std = {};

std.weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
std.weeksPerMonth = [4.3, 4, 4.3, 4.2, 4.3, 4.2, 4.3, 4.3, 4.2, 4.3, 4.2, 4.3];

std.holidays = {};
std.loadHolidays = function(year) {
  var url = 'https://feiertage-api.de/api/?jahr=' + year + '&nur_land=BB';
  $.ajax({
    dataType: "json",
    url: url,
    async: false,
    success: function(data) {
      std.holidays[year] = {};
      for (day in data) {
        std.holidays[year][data[day].datum] = day;
      }
    },
    error: function(a, b, c) {
      alert(b + ': ' + c);
      exit;
    }
  });
}

std.isHoliday = function(day, month, year) {
  if (!(year in std.holidays))
    std.loadHolidays(year);

  month = ((month < 9) ? '0' : '') + (month + 1);
  day   = ((  day < 9) ? '0' : '') + (  day + 1);
  return (year + '-' + month + '-' + day) in std.holidays[year];
}

std.parseTimeToQuarters = function(timeStr) {
  timeParts = timeStr.split(':');
  return Math.round(timeParts[0] * 4 + timeParts[1] / 15);
}

std.getDaysInMonth = function(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

std.quartersToTime = function(quarters, intervalMode = false) {
  minutes = quarters % 4;
  quarters -= minutes;
  minutes *= 15;
  if (minutes < 10)
    minutes = '0' + minutes
  hours = quarters / 4;
  if (!intervalMode && hours < 10)
    hours = '0' + hours;
  return hours + ':' + minutes;
}

std.fromInterval = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

std.submitForm = function(e) {
  e.preventDefault();

  var name = $('#form-name').val().trim();
  console.log('Name: ' + name);
  if(name == '') {
    alert('Bitte gib einen Namen ein.');
    $('#form-name').focus();
    return;
  }

  var weekQuarters = Math.round($('#form-hours').val().replace(',', '.') * 4);
  console.log('weekQuarters: ' + weekQuarters);
  if (!weekQuarters) {
    alert('Bitte gib eine gültige Anzahl Wochenstunden ein. (gerundet auf ganze Viertelstunden)');
    $('#form-hours').focus();
    return;
  }

  var personnelNr = +$('#form-personnelnr').val();
  console.log('personnelNr: ' + personnelNr);
  if(personnelNr != 0 && !personnelNr) {
    alert('Bitte gib eine gültige Personalnummer ein.');
    $('#form-personnelnr').focus();
    return;
  }

  var numMonths = $('input[name=form-duration]').val().trim();
  if (numMonths == '')
    numMonths = $('input[name=form-duration]').attr('placeholder');
  numMonths = parseInt(numMonths);
  console.log('numMonths: ' + numMonths);
  if(!numMonths) {
    alert('Bitte gib eine gültige Vertragsdauer ein');
    $('#form-duration').focus();
    return;
  }

  var monthStart = parseInt($('#form-start').val());
  console.log('monthStart: ' + monthStart);

  var workingWeekdays = [];
  $('input[name=form-working-days]:checked').each(function(i, item) {
    workingWeekdays.push(parseInt($(item).val()));
  });
  console.log('workingWeekdays: ' + workingWeekdays);
  if (!workingWeekdays.length) {
    alert('Bitte wähle mindestens einen Arbeitstag aus');
    $('#form-distribution').focus();
    return;
  }

  var startTimeMin = $('input[name=form-start-time-min]').val().trim();
  if (startTimeMin == '')
    startTimeMin = $('input[name=form-start-time-min]').attr('placeholder');
  startTimeMin = std.parseTimeToQuarters(startTimeMin);
  console.log('startTimeMin: "' + startTimeMin + '"');
  if(startTimeMin != 0 && !startTimeMin) {
    alert('Bitte gib eine gültige Mindest-Startzeit ein');
    $('#form-start-time-min').focus();
    return;
  }

  var startTimeMax = $('input[name=form-start-time-max]').val().trim();
  if (startTimeMax == '')
    startTimeMax = $('input[name=form-start-time-max]').attr('placeholder');
  startTimeMax = std.parseTimeToQuarters(startTimeMax);
  console.log('startTimeMax: "' + startTimeMax + '"');
  if(startTimeMin != 0 && !startTimeMin) {
    alert('Bitte gib eine gültige Mindest-Startzeit ein');
    $('#form-start-time-min').focus();
    return;
  }

  var avoidHolidays = $('input[name=form-avoid-holidays]:first', $(this)).is(':checked');
  console.log('avoidHolidays: ' + avoidHolidays);

  var $print = $('#print');
  $print.empty();

  var yearStart = new Date().getFullYear();

  for (var m = 0; m < numMonths; ++m) {
    var month = (monthStart + m) % 12;
    var year = yearStart + Math.floor((monthStart + m) / 12);

    var $page = $('#templates .page').clone();

    $('.name_value', $page).text(name);
    $('.personalnumber_value', $page).text(personnelNr);
    $('.monthyear_value', $page).text((month + 1) + ' / ' + (year));
    $('.weekhours_value', $page).text(weekQuarters / 4);

    var weekdayStart = new Date(year, month, 1).getDay();

    var monthQuarters = Math.round(std.weeksPerMonth[month] * weekQuarters);
    console.log('monthQuarters: ' + monthQuarters);

    $('.sum span:first', $page).text(std.quartersToTime(monthQuarters, true));

    var workingDays = []
    for (var i = 0; i < std.getDaysInMonth(month, year); ++i) {
      if (workingWeekdays.indexOf((weekdayStart + i) % 7) != -1 && (!std.isHoliday(i, month, year) || !avoidHolidays))
        workingDays.push(i)
    }
    console.log('workingDays: ' + workingDays);

    while (workingDays.length > 0) {
      var day = workingDays.pop();

      var begin = std.fromInterval(startTimeMin, startTimeMax);
      var duration = Math.round(monthQuarters / (workingDays.length + 1));
      monthQuarters -= duration;

      var $tr = $('tr.day.number' + (day + 1), $page);

      if (std.isHoliday(day, month, year)) {
        $('.shortcut', $tr).text('F');
      }
      else {
        $('.begin', $tr).text(std.quartersToTime(begin));
        $('.end', $tr).text(std.quartersToTime(begin + duration));
        //$('.pause', $tr).text(pauseDuration);
        $('.sum', $tr).text(std.quartersToTime(duration, true));
      }
    }

    for (var i = 0; i < std.getDaysInMonth(month, year); ++i) {
      var $tr = $('tr.day.number' + (i + 1), $page);
      $('.number', $tr).html('<span>' + std.weekdays[(weekdayStart + i) % 7] + ',</span> ' + (i + 1));
    }

    $print.append($page[0]);
    $print.append('<div class="pagebreak"></div>');
    $print.append('<div class="page-separator"></div>');
  }

  window.print();
}
