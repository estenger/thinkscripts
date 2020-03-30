declare lower;

input indicator = {default "None", "Averages", "Bollinger Bands", "MACD"};
def displayAverages;
def displayBollingerBands;
def displayMACD;

# Determine which indicator to show
switch (indicator) {
    case "Averages":
        displayAverages = yes;
        displayBollingerBands = no;
        displayMACD = no;
    case "Bollinger Bands":
        displayAverages = no;
        displayBollingerBands = yes;
        displayMACD = no;
    case "MACD":
        displayAverages = no;
        displayBollingerBands = no;
        displayMACD = yes;
    case "None":
        displayAverages = no;
        displayBollingerBands = no;
        displayMACD = no;
}


# Averages related input
input average_fast = 12;
input average_slow = 26;
input averageTypeString = {SIMPLE, default EXPONENTIAL, WEIGHTED, WILDERS, HULL};

# Bollinger Band related inputs
input Bollinger_Bands_Periods = 20;
input Bollinger_Bands_N_Stddev = 2;
def bb_length = Bollinger_Bands_Periods;
def bb_width = Bollinger_Bands_N_Stddev;

# MACD related input
input MACD_fastLength = 12;
input MACD_slowLength = 26;
input MACDLength = 9;
input MACD_averageType = AverageType.EXPONENTIAL;
input MACD_showBreakoutSignals = no;


# Define which Average algorithm to use
def averageType;
switch (averageTypeString) {
    case SIMPLE:
        averageType = AverageType.SIMPLE;
    case EXPONENTIAL:
        averageType= AverageType.EXPONENTIAL;
    case WEIGHTED:
        averageType = AverageType.WEIGHTED;
    case WILDERS:
        averageType = AverageType.WILDERS;
    case HULL:
        averageType = AverageType.HULL;
}

# Calculate the normalized IV
def ImpVol = IMP_VOLATILITY();
def high = HighestAll(ImpVol);
def low = LowestAll(ImpVol);
def range = high - low;
plot NormalizedImpVol = ((ImpVol - low) / range) * 100;
NormalizedImpVol.SetLineWeight(2);
NormalizedImpVol.DefineColor("low", Color.GREEN);
NormalizedImpVol.DefineColor("mid", Color.YELLOW);
NormalizedImpVol.DefineColor("high", Color.RED);
NormalizedImpVol.AssignValueColor(if NormalizedImpVol <= 33 then NormalizedImpVol.Color("low") else if NormalizedImpVol <= 66 then NormalizedImpVol.Color("mid") else NormalizedImpVol.Color("high"));

# TODO: Show actual IV in a label



# TODO: Optionally calculate IV Percentile instead of IV Rank


# Calculate the Moving Averages
plot sma_fast = if displayAverages then MovingAverage(averageType, NormalizedImpVol, average_fast) else 0;
sma_fast.SetHiding(!displayAverages);
sma_fast.SetDefaultColor(Color.CYAN);

plot sma_slow =  if displayAverages then MovingAverage(averageType, NormalizedImpVol, average_slow) else 0;
sma_slow.SetHiding(!displayAverages);
sma_slow.SetDefaultColor(Color.YELLOW);
AddCloud(sma_fast, sma_slow, Color.RED, Color.GREEN);


# Calculate the Bollinger Bands
def stdev = StDev(NormalizedImpVol, bb_length);
plot bb_avg =  if displayBollingerBands then Average(NormalizedImpVol, bb_length) else 0;
plot bb_upper = if displayBollingerBands then bb_avg + (bb_width * stdev) else 0;
plot bb_lower =  if displayBollingerBands then bb_avg - (bb_width * stdev) else 0;
bb_avg.SetHiding(!displayBollingerBands);
bb_upper.SetHiding(!displayBollingerBands);
bb_lower.SetHiding(!displayBollingerBands);
AddCloud(bb_upper, bb_avg, Color.CYAN, COLOR.RED, no);
AddCloud(bb_avg, bb_lower, COLOR.CYAN, COLOR.RED, no);

# Calculate the MACD for IV
def signal = NormalizedImpVol;
def Value = MovingAverage(MACD_averageType, signal, MACD_fastLength) - MovingAverage(MACD_averageType, signal, MACD_slowLength);
def lowValue = LowestAll(Value);
def lowValuePositive = if lowValue < 0 then lowValue * -1 else lowValue;
def highValue = HighestAll(Value);
def maxRangeValue = if highValue > lowValuePositive then highValue else lowValuePositive;
plot ValueNorm = Value / maxRangeValue * 100;
ValueNorm.SetHiding(!displayMACD);

plot Avg = MovingAverage(MACD_averageType, ValueNorm, MACDLength);
# def lowAvg = LowestAll(Avg);
# def highAvg = HighestAll(Avg);
# def rangeAvg = lowAvg - highAvg;
# plot AvgNorm = ((Avg - lowAvg) / rangeAvg) * 100;
Avg.SetHiding(!displayMACD);

plot Diff = ValueNorm - Avg;
# def lowDiff = LowestAll(Diff);
# def highDiff = HighestAll(Diff);
# def rangeDiff = lowDiff - highDiff;
# plot DiffNorm = ((Diff - lowDiff) / rangeDiff) * 100;
Diff.SetHiding(!displayMACD);

plot ZeroLine = 0;
ZeroLine.SetHiding(!displayMACD);

plot UpSignal = if Diff crosses above ZeroLine then ZeroLine else Double.NaN;
plot DownSignal = if Diff crosses below ZeroLine then ZeroLine else Double.NaN;

UpSignal.SetHiding(!MACD_showBreakoutSignals or !displayMACD);
DownSignal.SetHiding(!MACD_showBreakoutSignals or !displayMACD);

ValueNorm.SetDefaultColor(GetColor(1));
Avg.SetDefaultColor(GetColor(8));
Diff.SetDefaultColor(GetColor(5));
Diff.SetPaintingStrategy(PaintingStrategy.HISTOGRAM);
Diff.SetLineWeight(3);
Diff.DefineColor("Positive and Up", Color.GREEN);
Diff.DefineColor("Positive and Down", Color.DARK_GREEN);
Diff.DefineColor("Negative and Down", Color.RED);
Diff.DefineColor("Negative and Up", Color.DARK_RED);
Diff.AssignValueColor(if Diff >= 0 then if Diff > Diff[1] then Diff.color("Positive and Up") else Diff.color("Positive and Down") else if Diff < Diff[1] then Diff.color("Negative and Down") else Diff.color("Negative and Up"));
ZeroLine.SetDefaultColor(GetColor(0));
UpSignal.SetDefaultColor(Color.UPTICK);
UpSignal.SetPaintingStrategy(PaintingStrategy.ARROW_UP);
DownSignal.SetDefaultColor(Color.DOWNTICK);
DownSignal.SetPaintingStrategy(PaintingStrategy.ARROW_DOWN);
