# imports
from math import floor
from skimage import filters, io, util, color, transform, draw
import numpy as np

# settings
input_path = "./cache/input/"
input_file_format = ".jpg"

output_path = "./cache/output/"
output_file_format = ".png"

dark_limit = 150
light_limit = 230

angle_from = np.pi / 2.1
angle_to = np.pi / 1.9
angle_detail = 10
noise_limit = 4
near_top_tresshold = 4

# infinite line to endpoint generator
def line_endpoints(point, slope, shape):

    slope = slope if slope != 0 else 0.0000001
    shape = (shape[1], shape[0])

    points = []

    x = 0 - point[0]
    cur = (point[0] + x, point[1] + slope * x)
    if cur[1] >= 0 and cur[1] < shape[1]:
        points.append(cur)

    x = shape[0] - 1 - point[0]
    cur = (point[0] + x, point[1] + slope * x)
    if cur[1] >= 0 and cur[1] < shape[1]:
        points.append(cur)

    x = (0 - point[1]) / slope
    cur = (point[0] + x, point[1] + slope * x)
    if cur[0] >= 0 and cur[0] < shape[0]:
        points.append(cur)

    x = (shape[1] - 1 - point[1]) / slope
    cur = (point[0] + x, point[1] + slope * x)
    if cur[0] >= 0 and cur[0] < shape[0]:
        points.append(cur)

    return points[0], points[1]


# get downloaded images
images = io.ImageCollection(f"{input_path}*{input_file_format}")

# get edges of image
for (input, file_path) in zip(images, images.files):

    # get filename
    file_name = file_path.split("\\")[-1][: -len(input_file_format)]

    # print (can be removed)
    print(f"> Processing image: '{file_name}'")

    # get edges of image
    horizon = color.rgb2gray(input)
    horizon = filters.sobel(horizon)

    # remove static from image
    max = np.amax(horizon)
    with np.nditer(horizon, op_flags=["readwrite"]) as it:
        for x in it:
            x[...] = 0 if x < max / noise_limit else max

    # Classic straight-line Hough transform
    tested_angles = np.linspace(angle_from, angle_to, angle_detail, endpoint=False)
    h, t, d = transform.hough_line(horizon, theta=tested_angles)

    # set up list
    lines = []

    # loop through all detected lines
    for _, angle, dist in zip(*transform.hough_line_peaks(h, t, d)):

        # calculate needed parameters
        point = dist * np.array([np.cos(angle), np.sin(angle)])
        slope = np.tan(angle + np.pi / 2)

        # get endpoints
        p1, p2 = line_endpoints(point, slope, horizon.shape)

        # calculate middle
        middle = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)

        # add line to list
        lines.append([p1, p2, middle])

    # get highest line
    lines.sort(key=lambda e: e[2][1])

    # create output
    output = input

    # black out too dark and too light pixels
    for i in range(len(output[0])):
        for j in range(len(output)):
            if (
                output[j][i][0] < dark_limit
                and output[j][i][1] < dark_limit
                and output[j][i][2] < dark_limit
            ):
                output[j][i] = [0, 0, 0]
            elif (
                output[j][i][0] > light_limit
                and output[j][i][1] > light_limit
                and output[j][i][2] > light_limit
            ):
                output[j][i] = [0, 0, 0]

    # blank out masing image
    horizon = np.zeros(horizon.shape)

    # blank image indicator
    blank = False

    # indicate plank if no lines are available
    if len(lines) == 0:
        blank = True

    # check if line is far enough from the top
    if not blank and lines[0][2][1] > horizon.shape[0] / near_top_tresshold:

        # draw line to image
        [p1, p2, middle] = lines[0]
        horizon[draw.line(floor(p1[1]), floor(p1[0]), floor(p2[1]), floor(p2[0]))] = 1

        # mask
        for i in range(len(horizon[0])):

            # set variables
            set_to = 0

            for j in range(len(horizon)):

                # detect line
                if horizon[j][i] == 1:
                    set_to = 1

                # change pixel
                if set_to == 1:
                    output[j][i] = [0, 0, 0]
    else:

        # mask
        output = np.zeros(output.shape)

        # indicate blank
        blank = True

    # if there are colors to consider
    if not blank:

        # add togeather the sky colors
        colors = [[] for _ in range(3)]
        for i in range(len(output[0])):
            for j in range(len(output)):
                if not (output[j][i] == [0, 0, 0]).all():
                    colors[0].append(output[j][i][0])
                    colors[1].append(output[j][i][1])
                    colors[2].append(output[j][i][2])

        # average the colors
        average = [round(np.sum(c) / len(c)) for c in colors]

        # print average color
        print(f"> Average color: {average}")
    else:
        print("> Can't process image!")

    # save image
    io.imsave(
        output_path + file_name + output_file_format,
        util.img_as_ubyte(output),
        check_contrast=False,
    )
