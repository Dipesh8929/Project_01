import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { setCredentials } from '../../features/auth/authSlice'

const baseQuery = fetchBaseQuery({
    baseUrl: 'http://localhost:3500',
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {    //rtl
        const token = getState().auth.token
        // console.log(token)
        if (token) {
            headers.set("authorization", `Bearer ${token}`)
        }
        return headers
    }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
    // console.log(args) // request url, method, body
    // console.log(api) // signal, dispatch, getState()
    // console.log(extraOptions) //custom like {shout: true}
    let result = await baseQuery(args, api, extraOptions)
    console.log(result)

    if (result?.error?.status === 403) {
        console.log('sending refresh token')

        const refreshResult = await baseQuery('/auth/refresh', api, extraOptions)
        console.log(refreshResult);

        if (refreshResult?.data) {
            api.dispatch(setCredentials({ ...refreshResult.data }))
            result = await baseQuery(args, api, extraOptions)
        } else {

            if (refreshResult?.error?.status === 403) {
                refreshResult.error.data.message = "Your login has expired."
            }
            return refreshResult
        }
    }
    // if (result?.error?.status === 401) {
        // const navigate = useNavigate();
        // Use the 'navigate' function to redirect to the '/login' page
        // navigate('/login');
        // return result; // You can choose to return the result or not, depending on your use case
    // }
    
    // console.log(result)
    return result
}

export const apiSlice = createApi({
    baseQuery: baseQueryWithReauth,
    // tagTypes: ['Note', 'User'],
    endpoints: builder => ({})
})